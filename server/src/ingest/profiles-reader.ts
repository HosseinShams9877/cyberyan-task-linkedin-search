/**
 * Reader for the shipped dataset file.
 *
 * `data/300 user linkedin.txt` is not a plain CSV export: it is a grep dump
 * collected from ~11 differently ordered CSV shards. Consequences handled here:
 *
 *  1. a line may start with `<path>.csv(<lineno>): ` — the grep prefix;
 *  2. prefixed shards carry an extra leading dataset-id column;
 *  3. cells contain RFC4180 quoted values with embedded CRLF, so one record can
 *     span several physical lines;
 *  4. grep only emitted *matching* physical lines, so some records are truncated
 *     and some lines are the middle of a record whose head was never emitted.
 *     Such a line starts inside a quoted cell: re-parsing it with the quote
 *     state already open restores correct cell boundaries ("headless" record).
 */

const GREP_PREFIX = /^(?:[A-Za-z]:\\.*?\.csv|\/.*?\.csv)\((\d+)\):\s?/;
const DATASET_ID = /^[A-Za-z0-9_-]{16,}_\d{4}$/;
const PROFILE_URL = /linkedin\.com\/in\//;
const LITERAL = /^[[{]/;

export interface RawRecord {
  /** 1-based physical line where the record starts. */
  line: number;
  /** Line number inside the original shard, when the dump prefix carried one. */
  shardLine: number | null;
  sourceId: string | null;
  fields: string[];
  /** The record ended with an unterminated quoted cell (dump cut it off). */
  truncated: boolean;
  /** Recovered from a mid-record fragment: the identity columns are missing. */
  headless: boolean;
}

interface Split {
  fields: string[];
  openQuote: boolean;
}

/** RFC4180 split of one physical line, optionally continuing an open cell. */
export function splitCsvLine(line: string, startOpen = false, seed?: Split): Split {
  const fields = seed ? seed.fields.slice() : [];
  let cell = seed ? `${fields.pop() ?? ''}\n` : '';
  let inQuotes = startOpen;

  for (let i = 0; i < line.length; i += 1) {
    const c = line[i] as string;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      fields.push(cell);
      cell = '';
      continue;
    }
    cell += c;
  }
  fields.push(cell);
  return { fields, openQuote: inQuotes };
}

const startsRecord = (fields: string[]): boolean => {
  const urlAt = fields.findIndex((f) => PROFILE_URL.test(f) && !LITERAL.test(f.trim()));
  if (urlAt < 0 || urlAt > 10) return false;
  const first = (fields[0] ?? '').trim();
  if (LITERAL.test(first)) return false;
  return DATASET_ID.test(first) || /^[^,\d]{2,60}$/.test(first);
};

/** A fragment is usable when re-parsing with an open quote exposes the payload. */
const recoversAsHeadless = (fields: string[]): boolean => {
  const literals = fields.filter((f) => LITERAL.test(f.trim())).length;
  const hasProfiles = fields.some((f) => LITERAL.test(f.trim()) && PROFILE_URL.test(f));
  return literals >= 10 && hasProfiles;
};

export interface DumpReadResult {
  header: string[];
  records: RawRecord[];
  /** Lines that were neither a record, a continuation nor recoverable. */
  skipped: number;
  repeatedHeaders: number;
}

export function readDumpRecords(text: string): DumpReadResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = splitCsvLine(lines[0] ?? '').fields.map((h) => h.trim());
  const records: RawRecord[] = [];
  let current: (RawRecord & { split: Split }) | null = null;
  let skipped = 0;
  let repeatedHeaders = 0;

  const push = (): void => {
    if (!current) return;
    const { split, ...rest } = current;
    records.push({ ...rest, fields: split.fields, truncated: split.openQuote });
    current = null;
  };

  for (let n = 1; n < lines.length; n += 1) {
    const line = lines[n] as string;
    if (line.trim() === '') continue;

    const prefix = GREP_PREFIX.exec(line);
    const body = prefix ? line.slice(prefix[0].length) : line;
    const shardLine = prefix?.[1] ? Number(prefix[1]) : null;
    const split = splitCsvLine(body);

    if ((split.fields[0] ?? '').trim() === header[0]) {
      repeatedHeaders += 1;
      continue;
    }

    if (startsRecord(split.fields)) {
      push();
      current = {
        line: n + 1,
        shardLine,
        sourceId: null,
        fields: [],
        truncated: false,
        headless: false,
        split,
      };
      continue;
    }

    if (current && current.split.openQuote) {
      current.split = splitCsvLine(body, true, current.split);
      continue;
    }

    const reopened = splitCsvLine(body, true);
    if (recoversAsHeadless(reopened.fields)) {
      push();
      current = {
        line: n + 1,
        shardLine,
        sourceId: null,
        fields: [],
        truncated: false,
        headless: true,
        split: reopened,
      };
      continue;
    }
    skipped += 1;
  }
  push();

  for (const record of records) {
    record.fields = record.fields.map((f) => f.trim());
    const first = record.fields[0] ?? '';
    if (DATASET_ID.test(first)) {
      record.sourceId = first;
      record.fields = record.fields.slice(1);
    }
    while (record.fields.length > 0 && record.fields[record.fields.length - 1] === '') record.fields.pop();
  }

  return { header, records, skipped, repeatedHeaders };
}
