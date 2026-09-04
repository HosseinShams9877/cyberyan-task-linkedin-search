# LinkedIn Dataset Search Engine

A full-stack search engine over a LinkedIn profile dataset: keyword search across
names, titles and skills, four stacked filters, a profile drawer, and a dashboard
of aggregates. One repository, two apps, one Vercel deployment.

| | |
|---|---|
| **Frontend** | React 19 + Vite + TypeScript, Tailwind CSS v4, Zustand, Recharts |
| **Backend** | Node 20+, Express 5 + TypeScript, Prisma 6, zod validation |
| **Database** | SQLite locally (`file:./dev.db`), PostgreSQL (Neon) in production |
| **Hosting** | Vercel - static client + one serverless function, same origin |

The dataset that ships in `data/` yields **303 profiles**, 2,778 distinct skills,
267 employers and 10 countries.

---

## 1. Architecture

```
linkedin-search-app/
├── client/                  React + Vite frontend
│   ├── src/
│   │   ├── components/      SearchBar, ResultList, ProfileDrawer, Dashboard, charts/
│   │   ├── lib/             api.ts (fetch wrapper), api-types.ts, format.ts
│   │   ├── store/           useSearchStore.ts (Zustand: filters, debounce, requests)
│   │   └── index.css        Tailwind v4 theme tokens + component utilities
│   └── vite.config.ts
├── server/                  Express + Prisma API
│   ├── api/index.ts         Vercel entrypoint - `export default createApp()`
│   ├── src/
│   │   ├── app.ts           Express app factory (CORS, JSON, routes, errors)
│   │   ├── index.ts         Local/Docker entrypoint - app.listen(PORT)
│   │   ├── routes/          zod-validated route handlers
│   │   ├── services/        search.ts, stats.ts (all Prisma queries)
│   │   ├── ingest/          dataset reader, field extraction, ingest report
│   │   └── lib/             prisma client, env, http helpers
│   ├── prisma/
│   │   ├── schema.prisma    single source of truth (provider is rewritten)
│   │   └── seed.ts          idempotent loader for ./data
│   ├── scripts/             prisma-schema / postinstall / copy-generated
│   └── Dockerfile
├── data/300 user linkedin.txt   the dataset (5 MB)
├── vercel.json              builds + routes for the whole monorepo
└── package.json             dev / build / setup scripts for both apps
```

`client/` and `server/` are independent npm packages - deliberately **not** npm
workspaces, because Vercel's `builds` installs each entrypoint's own
`package.json` and a shared root lockfile confuses that.

### Request flow

Locally the two dev servers talk over the network; in production they are the same
origin, so the browser never needs CORS or an API host.

```
local     browser :5173 ──fetch VITE_API_URL(:5000)──> Express :5000 ──> SQLite dev.db
vercel    browser  /   ──fetch /api/*  (same origin)──> λ server/api/index.ts ──> Neon
```

`client/src/lib/api.ts` picks the base URL once:

```ts
const configured = (import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE = (configured || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');
```

So production needs no environment variable at all: an empty base means `/api/*`.

### Vercel routing

`vercel.json` declares two builds and the routing table between them:

| Build | Entrypoint | Builder | Output |
|---|---|---|---|
| API | `server/api/index.ts` | `@vercel/node` | one serverless function |
| Web | `package.json` (root, `vercel-build`) | `@vercel/static-build` | `client/dist` served at `/` |

| Route | Goes to |
|---|---|
| `/api/*` | the serverless function |
| `/assets/*` | static assets, plus a 1-year immutable cache header |
| anything that exists on disk | that file (`handle: filesystem`) |
| everything else | `/index.html` - the SPA fallback, so `/#dashboard` and refreshes work |

The static build's entrypoint is the **root** `package.json` on purpose: with
legacy `builds`, output is mounted relative to the entrypoint's directory, so a
root entrypoint puts `index.html` at `/` and the routes above need no `/client`
prefix. Its `vercel-build` script installs and builds the client.

### One schema, two databases

Prisma will not accept `env()` in `datasource.provider`, so a build step supplies
it. `server/scripts/prisma-schema.mjs` reads `DATABASE_URL`, picks the provider and
writes `prisma/schema.generated.prisma` (git-ignored) from `prisma/schema.prisma`:

| `DATABASE_URL` | provider |
|---|---|
| `file:./dev.db` | `sqlite` |
| `postgres://…`, `postgresql://…`, `prisma://…` | `postgresql` |

Every Prisma command runs that script first, so the same models and the same
queries serve both engines. Two consequences shaped the schema and the services:

- **The schema is provider-agnostic** - no `String[]`, no `Json`, no native types.
  Repeated values are real relations (`Skill`/`ProfileSkill`, `Experience`,
  `Education`); untouched source payloads are stored as JSON *strings*.
- **No `mode: 'insensitive'`** - SQLite does not support it. The dataset is already
  lowercase and the seed builds a lowercased `searchText` haystack, so lowercasing
  the needle is enough and one query text works on both engines.

Schema changes are applied with `prisma db push`, not `prisma migrate`: a
migration history generated against SQLite cannot be replayed on PostgreSQL, and
the deployment target creates its tables from scratch on the first build.

---

## 2. Local setup

**Prerequisites:** Node 20.19+ and npm 10+. Nothing else - the local database is a
file, and the dataset is already in `data/`.

```bash
# 1. install both packages (root, client and server)
npm install
npm run install:all

# 2. create dev.db from the schema, then load ./data into it
npm run db:push
npm run seed

# 3. start the API (:5000) and the Vite dev server (:5173) together
npm run dev
```

Then open <http://localhost:5173>. Steps 1-2 are also available as one command:
`npm install && npm run setup`.

### Environment files

Both apps ship a `.env.example`. Copy them only if you want to change a default -
the defaults already work.

```bash
cp server/.env.example server/.env    # DATABASE_URL="file:./dev.db", PORT=5000
cp client/.env.example client/.env    # VITE_API_URL, optional
```

`server/.env` is read by Prisma and by the API. SQLite paths are resolved relative
to `server/prisma/`, so `file:./dev.db` means `server/prisma/dev.db`.

### Seeding

`npm run seed` runs `server/prisma/seed.ts`, which finds the newest
`data/300 user linkedin*` file, parses it and inserts profiles, skills, experience
and education rows in one transaction. It is **idempotent**: it exits immediately if
the database already holds profiles, because the same script runs on every Vercel
build. Use `npm --prefix server run seed -- --force` to wipe and reload.

The file is not a clean CSV - it is a grep dump collected from ~11 differently
ordered shards, so the reader handles the `path.csv(1234):` prefix, an extra
dataset-id column, quoted cells containing CRLF, and records whose beginning was
never emitted. Records recovered from a fragment are flagged `partial` and sort
last under "Best match". `npm --prefix server run ingest:report` prints a field
coverage report without touching the database.

### Root scripts

| Script | What it does |
|---|---|
| `npm run install:all` | `npm install` in `server/` then `client/` |
| `npm run setup` | `install:all` + `db:push` + `seed` |
| `npm run dev` | both dev servers via `concurrently` (`api`, `web`) |
| `npm run dev:api` / `dev:web` | one of them alone |
| `npm run build` | client production build, then `tsc` for the server |
| `npm run typecheck` | `tsc` over both packages, no emit |
| `npm run db:push` | apply `schema.prisma` to the database in `DATABASE_URL` |
| `npm run seed` | load `./data` (no-op when already seeded) |
| `npm run start` | run the compiled server from `server/dist` |
| `npm run studio` | Prisma Studio against the local database |

---

## 3. How search and filters work

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | liveness probe |
| `GET` | `/api/search` | paginated, filtered, sorted profile list |
| `GET` | `/api/filters` | values for the dropdowns, with counts |
| `GET` | `/api/stats` | dashboard aggregates |
| `GET` | `/api/profiles/:id` | one full profile for the drawer |

`GET /api/search` accepts `keyword`, `jobTitle`, `skill`, `industry`, `country`,
`company`, `role`, `minConnections`, `minYears`, `hasEmail`, `sort`, `page` and
`pageSize`. The query object is parsed by a **strict** zod schema, so an unknown
parameter is a `400` rather than a silently ignored typo; numbers are coerced and
bounded and `pageSize` is capped at 100 so no request can ask for the whole table.

```bash
curl "http://localhost:5000/api/search?keyword=engineer&jobTitle=manager&skill=leadership&minYears=5&sort=connections"
```

```jsonc
{
  "total": 26, "page": 1, "pageSize": 20, "totalPages": 2, "tookMs": 23,
  "query": { "keyword": "engineer", "jobTitle": "manager", /* … echoed back … */ },
  "results": [ { "id": 42, "fullName": "…", "jobTitle": "…", "skills": ["…"], "skillCount": 31 } ]
}
```

### Keyword

The seed concatenates each profile's name, username, title, role, company,
industry, location, summary, skills, interests, job levels, every past job title
and employer, and every school, degree and major into one lowercased `searchText`
column. A keyword is split on whitespace and commas into at most 8 terms, and
**every term must appear** in that column (`AND`, not `OR`), which is what makes
`engineer texas` narrow the result set instead of widening it.

### Filters

Filters are `AND`ed with each other and with the keyword. Each one is a substring
match, so `manager` also finds `senior program manager`:

| Parameter | Matches |
|---|---|
| `jobTitle` | the current title **or** any past `Experience.title` |
| `skill` | any related skill name |
| `industry` | the profile industry **or** the current employer's industry |
| `country` | the profile country |
| `company` | the current employer |
| `role` | the normalised job family (`engineering`, `operations`, …) |
| `minYears` | `inferredYears >= n` |
| `minConnections` | `connections >= n` |
| `hasEmail` | whether the record has at least one email on file |

`sort` is `relevance` (default), `name`, `connections` or `experience`. "Relevance"
puts complete records before recovered fragments, then the best-connected first.
Every sort ends with a non-null tiebreaker, because SQLite and PostgreSQL order
`NULL`s differently and pagination has to be stable on both.

The dropdown values come from `/api/filters`, which returns the most common job
titles, skills, industries, countries and roles **with their counts**, so the UI can
show `Leadership (142)` and never offers a value that would return nothing.

### In the browser

`client/src/store/useSearchStore.ts` holds the filter state and does three things
worth naming: it **debounces** the keyword by 350 ms, it **aborts** the previous
request with an `AbortController` when a new one starts, and it keeps the previous
page visible at reduced opacity during a refetch instead of flashing a skeleton.
Filter changes reset to page 1; the active-filter count drives the *Clear* button.

A card shows five of a profile's skills, so the ones that matched come first and are
tinted - one chip per search term, the shortest match, then the rest of the row keeps
its alphabetical sample. Without that, searching `skill=leadership` renders
`Afghanistan · Air Force · Army` on every card while the skill that produced the hit
hides behind `+45 more`.

`/api/stats` feeds the dashboard: totals, the top skills, and profile counts by
role, industry, employer, country, connection band and inferred salary band. Every
chart has a `Table` toggle that lists the same rows with counts and shares, so no
value is reachable only by hovering.

---

## 4. Deploy to Vercel

Three things happen once: push the repo, create the database, tell Vercel the
connection string. After that every deployment is a `git push`.

### Step 1 - push to GitHub

```bash
git init
git add .
git commit -m "LinkedIn Dataset Search Engine"
git branch -M main
git remote add origin https://github.com/<you>/linkedin-search-app.git
git push -u origin main
```

`data/` is committed on purpose - the Vercel build seeds the production database
from it. It contains real personal data, so **create the repository as private.**

### Step 2 - create the Neon database

1. Sign in at <https://neon.tech> and create a project (any region; pick one near
   your Vercel region to keep query latency low).
2. Open **Dashboard → Connection string** and copy the **pooled** connection
   string - the host contains `-pooler`. Serverless functions open many short-lived
   connections, and the pooler is what keeps that from exhausting Postgres.

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

You do not have to create tables or run anything: the first deployment does it.

### Step 3 - import the project into Vercel

1. <https://vercel.com/new> → **Import Git Repository** → pick the repo.
2. **Framework Preset: Other.** Leave *Root Directory* at the repository root and
   leave *Build Command*, *Output Directory* and *Install Command* empty -
   `vercel.json` defines all of it.
3. Do not deploy yet - add the environment variable first (step 4).

### Step 4 - set `DATABASE_URL`

**Settings → Environment Variables** → add one variable for *Production*,
*Preview* and *Development*:

| Name | Value |
|---|---|
| `DATABASE_URL` | the pooled Neon connection string from step 2 |

That is the only required variable. `PORT` is ignored by serverless functions, and
the client needs no `VITE_API_URL` in production because the API is same-origin.

> Using the Vercel-Neon integration instead? It injects `DATABASE_URL` for you -
> check the name it used and keep only one definition.

### Step 5 - deploy

Click **Deploy** (or push a commit). The build:

1. **API build** - `npm install` in `server/`, whose `postinstall` sees `VERCEL=1`
   and therefore: writes `schema.generated.prisma` with `provider = "postgresql"`,
   runs `prisma generate`, runs `prisma db push` to create the tables, then runs
   the seed - which loads `data/` on the first deploy and is a no-op afterwards.
   It fails loudly if `DATABASE_URL` is missing. Then `@vercel/node` bundles
   `server/api/index.ts` into one function.
2. **Web build** - the root `vercel-build` script installs and builds the client
   into `client/dist`, which is served at `/`.

Verify:

```bash
curl https://<your-app>.vercel.app/api/health          # {"status":"ok",…}
curl "https://<your-app>.vercel.app/api/search?keyword=engineer" | head -c 200
open https://<your-app>.vercel.app/#dashboard
```

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails: `DATABASE_URL is not set for this Vercel deployment` | add it in step 4, then redeploy |
| API returns 500, logs show `Can't reach database server` | wrong or unpooled connection string; use the `-pooler` host with `?sslmode=require` |
| Search works, dashboard is empty | the seed found no dataset - confirm `data/300 user linkedin.txt` is committed |
| Frontend 404s on refresh of a sub-path | `vercel.json` was edited and lost the `/(.*) → /index.html` fallback |
| Tables exist but hold no rows | seeding is skipped when profiles exist; run `npm --prefix server run seed -- --force` against `DATABASE_URL` locally |

---

## Docker (optional, for non-Vercel hosting)

`server/Dockerfile` is a two-stage build. The Prisma provider is fixed when the
client is generated, so the database URL is a **build argument** as well as a
runtime variable:

```bash
docker build -t linkedin-search-api \
  --build-arg DATABASE_URL="postgresql://…?sslmode=require" ./server

docker run -p 5000:5000 -e DATABASE_URL="postgresql://…?sslmode=require" \
  linkedin-search-api
```

It runs as the unprivileged `node` user and has a `HEALTHCHECK` on `/api/health`.
Omit `--build-arg` and you get a SQLite image, which is only useful if you mount a
database into it.

## A note on the data

The dataset is a leaked-profile dump: it contains real names, email addresses,
phone numbers, birth years and city-level coordinates.

**Contact details never leave the server.** `emailsJson` and `phoneNumbersJson` are
stored but no endpoint returns them: `/api/profiles/:id` reports `emailCount` and
`phoneCount` instead, so nothing in the client can leak an address or a number, and
neither can a crafted request. Everything else the dataset holds - name, city,
region, birth year, gender, employment history - *is* returned and shown in the
profile drawer, because searching it is the point of the app. Keep the repository
and the deployment private, and delete the Neon project when you are done with it.

