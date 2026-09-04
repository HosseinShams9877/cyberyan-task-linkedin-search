/**
 * Parser for Python `repr` literals.
 *
 * The dataset stores nested values as Python literals inside CSV cells, e.g.
 *   [{'address': 'a@b.com', 'type': 'personal'}]
 *   {'status': 'updated', 'previous_version': '12.0'}
 *   [{'company': {...}, 'is_primary': True, 'summary': None}]
 * so they are not valid JSON: single quotes, None/True/False, NaN, tuples.
 */

export type PyValue = string | number | boolean | null | PyValue[] | { [key: string]: PyValue };

class PyParseError extends Error {}

export function parsePythonLiteral(input: string): PyValue {
  const s = input;
  let i = 0;

  const fail = (why: string): never => {
    throw new PyParseError(`${why} at offset ${i}`);
  };
  const ws = (): void => {
    while (i < s.length && /\s/.test(s[i] as string)) i += 1;
  };

  function value(): PyValue {
    ws();
    const c = s[i];
    if (c === undefined) return fail('unexpected end of input');
    if (c === '[') return sequence(']');
    if (c === '(') return sequence(')');
    if (c === '{') return mapping();
    if (c === "'" || c === '"') return quoted(c);
    return bare();
  }

  function sequence(close: ']' | ')'): PyValue[] {
    i += 1;
    const out: PyValue[] = [];
    for (;;) {
      ws();
      if (s[i] === close) {
        i += 1;
        return out;
      }
      out.push(value());
      ws();
      if (s[i] === ',') {
        i += 1;
        continue;
      }
      if (s[i] === close) {
        i += 1;
        return out;
      }
      return fail('expected "," or closing bracket');
    }
  }

  function mapping(): Record<string, PyValue> {
    i += 1;
    const out: Record<string, PyValue> = {};
    for (;;) {
      ws();
      if (s[i] === '}') {
        i += 1;
        return out;
      }
      const key = value();
      ws();
      if (s[i] !== ':') return fail('expected ":"');
      i += 1;
      out[String(key)] = value();
      ws();
      if (s[i] === ',') {
        i += 1;
        continue;
      }
      if (s[i] === '}') {
        i += 1;
        return out;
      }
      return fail('expected "," or "}"');
    }
  }

  function quoted(quote: string): string {
    i += 1;
    let out = '';
    while (i < s.length) {
      const c = s[i] as string;
      if (c === '\\') {
        const n = s[i + 1];
        i += 2;
        if (n === 'n') out += '\n';
        else if (n === 't') out += '\t';
        else if (n === 'r') out += '\r';
        else if (n === 'x') {
          out += String.fromCharCode(parseInt(s.slice(i, i + 2), 16));
          i += 2;
        } else if (n === 'u') {
          out += String.fromCharCode(parseInt(s.slice(i, i + 4), 16));
          i += 4;
        } else out += n ?? '';
        continue;
      }
      if (c === quote) {
        i += 1;
        return out;
      }
      out += c;
      i += 1;
    }
    return fail('unterminated string');
  }

  function bare(): PyValue {
    const start = i;
    while (i < s.length && !/[,\]})\:]/.test(s[i] as string)) i += 1;
    const raw = s.slice(start, i).trim();
    if (raw === 'None' || raw === 'nan' || raw === 'NaN' || raw === 'null') return null;
    if (raw === 'True') return true;
    if (raw === 'False') return false;
    if (/^-?\d+$/.test(raw)) return Number(raw);
    if (/^-?\d*\.\d+(e-?\d+)?$/i.test(raw)) return Number(raw);
    if (raw === '') return fail('empty value');
    return raw;
  }

  const parsed = value();
  ws();
  if (i !== s.length) return fail('trailing characters');
  return parsed;
}

/** Parse, or return undefined when the cell is not a well-formed literal. */
export function tryParsePythonLiteral(input: string): PyValue | undefined {
  try {
    return parsePythonLiteral(input.trim());
  } catch {
    return undefined;
  }
}

export const isRecord = (v: PyValue | undefined): v is Record<string, PyValue> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export const asString = (v: PyValue | undefined): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

export const asNumber = (v: PyValue | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const asStringArray = (v: PyValue | undefined): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

export const asRecordArray = (v: PyValue | undefined): Record<string, PyValue>[] =>
  Array.isArray(v) ? v.filter(isRecord) : [];
