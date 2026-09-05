# LinkedIn Dataset Search Engine

A full-stack search engine over a LinkedIn profile dataset: keyword search across
names, titles and skills, four stacked filters, a profile drawer, and a dashboard
of aggregates. One repository, two apps, one Vercel deployment.

| | |
|---|---|
| **Frontend** | React 19 + Vite + TypeScript, Tailwind CSS v4, Zustand, Recharts, English/Persian + dark/light |
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
│   │   ├── i18n/            language + theme context, en.ts / fa.ts catalogues
│   │   ├── lib/             api.ts (fetch wrapper), api-types.ts, format.ts
│   │   ├── store/           useSearchStore.ts (Zustand: filters, debounce, requests)
│   │   └── index.css        Tailwind v4 tokens (light default, dark override) + utilities
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

### Layout: what pins and what scrolls

The header and the filter bar sit in one `sticky top-0 z-30` wrapper, so the filters
pin with the header instead of having to know its height, and both spans stay exactly
as wide as the page. Only one box on the page is allowed to scroll sideways, and it is
the results grid.

`overflow-x: hidden` goes on `html`, not on `body` and not on a wrapper `div`. The root
element's used overflow propagates to the viewport, which stays the scrollport that
`position: sticky` resolves against; set the same rule on a descendant and *that* box
becomes the scrollport - one that never scrolls - and every sticky element inside it
silently stops pinning. Verified in the browser: `html=hidden`, `body=visible`,
`position=sticky`, and the bar's box still at `0,0` after a 600 px scroll.

The grid inside `ResultList` spells its tracks out - `grid-cols-[repeat(1,minmax(18rem,1fr))]`,
two at `sm`, three at `xl` - rather than `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`.
A numeric count compiles to `minmax(0, 1fr)`, a floor of zero, and a card's lines are
`truncate`d: `white-space: nowrap` gives them a min-content width in the hundreds of
pixels, so a squeezed track hands the overflow back to the page and the whole layout
drifts under the pinned bar. With the 18 rem floor the card measures 408 / 355 / 343 px
at 1440 / 768 / 390, and at 320 the grid is 288 px inside a 273 px container - 15 px of
scroll that stays in the cards. The bar does not move when that scroll is driven to
either end (`scrollLeft` +15 in English, -15 in Persian, where the axis runs the other
way and 0 is the right edge), and the page itself still has nothing to scroll.

A pinned bar costs height the results never get back, and the four selects stack on a
phone: left standing open the bar measured 591 px of an 844 px screen. So unless there
is room for it, everything but the keyword box collapses behind a *Filters* button that
carries the active count. "Room" is one `@custom-variant roomy` in `index.css` - 40 rem
wide **and** 37.5 rem tall - because a phone in landscape clears the width and fails the
height. Collapsed, the bar is 194 px of an 844 px screen; open on a desktop it is 292 px
of 900.

The height cap and its scroll live on the filter panel, not on the sticky bar. A scroll
container reserves a classic scrollbar's width from its children, and on the bar that
left the header 360 px wide on a 375 px page - visibly short of the full width it is
supposed to span. On the panel the same guard is invisible: `-mx-4 px-4` cancels out, so
the panel bleeds to the strip's padding edge, keeps the clipping edge clear of the focus
ring on the outermost control, and puts the scrollbar where the strip already ends.

---

## 4. Language, theme and direction

Two buttons in the header, top right: one swaps the language, one swaps the theme.
A first-time visitor gets **English**, left-to-right, on a **light** background;
`DEFAULT_LANG` and `DEFAULT_THEME` in `client/src/i18n/index.tsx` are the single
place that says so, and the pre-paint script in `client/index.html` repeats the same
two fallbacks. Both choices persist in `localStorage` under `lds.lang` and
`lds.theme`, so a reload keeps whatever the visitor picked.

Everything hangs off three attributes on `<html>`:

| Attribute | Set to | Drives |
|---|---|---|
| `lang` | `en` / `fa` | the font (`Inter` / `Vazirmatn`) and the screen-reader voice |
| `dir` | `ltr` / `rtl` | every logical property in the stylesheet |
| `class` | `dark` or absent | the token set |

### No flash on first paint

An inline script in `client/index.html` reads both keys and stamps those three
attributes **before** the bundle loads, so a user who chose dark Persian never
sees a frame of light English. `applyPrefs()` in `client/src/i18n/index.tsx` performs
the same three writes on every later toggle. If `localStorage` throws - a sandboxed
iframe, Safari private mode - the script falls through to the markup defaults and
the app still renders.

### Translations

`client/src/i18n/` is a hand-written React context, not a library:
`PreferencesProvider` owns the language and theme, and `useT()` returns a
`t(key, vars)` that looks up a message and fills its `{placeholders}`.

`en.ts` is the source of truth for the key set and exports
`type MessageKey = keyof typeof en`. `fa.ts` is typed `Record<MessageKey, string>`,
so **a key added to English fails the build until it is translated** - a missing
string is a type error rather than a blank space on screen.

Numbers, percentages and dates never appear as literal digits in a catalogue. They
are formatted by `client/src/lib/format.ts` against the active locale (`en-US` /
`fa-IR`) and interpolated, which is what gives Persian its own digits and grouping.
Chart tick formatters and Recharts label renderers have no component to read a hook
from, so the locale reaches `format.ts` through a module-level variable that the
provider keeps in step during render.

Dataset values - names, job titles, skills, company names, profile summaries - stay
in English in both languages, because they come from the source file rather than a
catalogue. The English prose blocks in the profile drawer carry `dir="ltr"` so their
punctuation stays put on a Persian page.

### Dates and the Jalali calendar

Persian does not just relabel a Gregorian date - it converts it. `formatDate()` in
`client/src/lib/format.ts` runs every date through `Intl.DateTimeFormat` with the
locale the provider set: `en-US` on a Gregorian calendar, or
`fa-IR-u-ca-persian` on the Jalali one. `2001-11-01` therefore reads
`November 1, 2001` in English and `۱۰ آبان ۱۳۸۰` in Persian, in Persian digits. That
covers the drawer's *Started* fact, the birth year, and both date ranges (work
experience and education); the range separator is an en dash, which is direction-
neutral, so the pair reads start-to-end either way.

The dataset gives dates at three precisions - `2019`, `2019-10`, `2019-10-08` - and
the output keeps whichever it was given rather than inventing a day. Converting a
partial date needs an anchor, and the choice of anchor is not free, because a Jalali
year begins around 21 March:

| Source | Anchored on | Persian | Why |
|---|---|---|---|
| `2019-10-08` | the day itself | `۱۶ مهر ۱۳۹۸` | exact |
| `2019-10` | the 1st | `مهر ۱۳۹۸` | a Gregorian month starts around the 10th of a Jalali one, so most of its days fall in the month the 1st lands in |
| `2019` | 1 July | `۱۳۹۸` | 1 January would land in `۱۳۹۷`, the year that covers only 79 days of 2019; 1 July picks the year that covers the other 286 |

So a year-only value carries the ±1 ambiguity the source already has - `2019` alone
cannot say whether it means `۱۳۹۷` or `۱۳۹۸` - and the majority year is the answer
that is right more often. Birth years go through the same path via `formatYear()`,
which also keeps 1958 from being printed as `1,958` by the thousands separator.

Persian always takes the abbreviated skeleton, because Persian month names have no
short form (`MMM` and `MMMM` both give `مهر`) and only that skeleton puts the month
before the year the way a Persian date is written - ICU's long form renders
`۱۳۹۸ مهر`. English keeps both styles: months spelled out for a date standing alone
in the facts list, abbreviated inside a range. Anything that does not parse as a date
is passed through untouched, because the source is a dump and a field holding a phone
number should look wrong rather than plausible.

### The dark strategy in Tailwind v4

Tailwind v4 has no `tailwind.config.js`; the class strategy is one line of CSS in
`client/src/index.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

That gives the usual `dark:` variant, but almost nothing in this app needs it. The
colours are semantic tokens - `bg-canvas`, `bg-surface`, `text-ink`, `border-line`,
`text-brand` - declared in `@theme` with their **light** values, then redefined for
`html.dark` in `@layer base`. A component names a role, and the theme decides the
value:

```css
@theme {
  --color-canvas: oklch(0.976 0.004 255);   /* light */
  --color-ink:    oklch(0.24 0.025 258);
}
@layer base {
  html.dark {
    --color-canvas: oklch(0.19 0.02 260);   /* dark */
    --color-ink:    oklch(0.98 0.004 255);
  }
}
```

Each theme's palette is *chosen for its own background*, not derived by inverting
the other: dark brand is a lighter, less saturated blue than the light one, because
the same hex cannot carry contrast on both surfaces. The `.dark` override lives in
`@layer base` rather than a second `@theme` block so it outranks the theme layer
regardless of source order. `color-scheme` is set per theme too, so form controls
and scrollbars follow.

The glass look is two utilities: `card` for panels and `pane` for the sticky header
and drawer chrome, each a `backdrop-blur` over a translucent surface token, plus a
fixed radial wash behind the page built with `color-mix()` off the brand token.

### RTL

Layout uses logical properties throughout - `ms-`/`me-`, `ps-`/`pe-`,
`start-`/`end-`, `border-s`, `text-start`/`text-end` - so `dir="rtl"` mirrors the
whole page with no `rtl:` overrides and no duplicated classes. The pagination
chevrons flip their path, since a "next" arrow points the other way in Persian.

Dataset values stay English even when the interface is Persian, and any value that
can overflow is truncated. `text-overflow: ellipsis` cuts at the logical end of the
line, so an English string that inherits an RTL page loses its head instead of its
tail - `Vice President, Military and Civili...` arrives as `...ry and Civilian Debt
Acquisition and Relief`. Every truncating value therefore carries `dir="auto"` and
resolves its own direction from its first strong character: the name, job title,
company, location and role in `ResultCard`, the name and title in `ProfileDrawer`,
and the donut legend labels. `rtl:text-right` then puts the alignment back to the
page direction, so the line still starts at the start edge of its card. `auto`
rather than a fixed `ltr` because those same slots fall back to a Persian string
when the record has no value.

The pinned bar and the results' own horizontal scroll are direction-agnostic for the
same reason - logical properties and a scroll container that is measured, not assumed.
See *Layout: what pins and what scrolls* above for the numbers on both sides.

Recharts is the exception. It has no RTL mode: marks are placed from absolute SVG
coordinates and an axis domain, and CSS `direction` cannot mirror a plot. So
`.recharts-wrapper` is pinned to `direction: ltr` to keep the internal coordinate
system stable, and each chart mirrors itself explicitly:

- `reversed` on the value axis and `orientation` on the category axis,
- swapped chart margins and flipped bar corner `radius`,
- the bar value labels left at `right`, which Recharts reads in value space, so a
  reversed axis makes it the growing end of the bar in either direction,
- for the donut, `startAngle={90}` with `endAngle={rtl ? 450 : -270}` so slices
  wind the reading direction,
- tooltips take the document direction back with `dir={dir}`.

Chart colours are concrete hex chosen in JS by the active theme
(`client/src/components/charts/theme.ts`), because Recharts paints SVG attributes
and an SVG `fill` cannot read a per-theme custom property. Both palettes were
validated for colour-vision deficiency separation against their own surface; every
chart also ships a `Table` toggle and named legend, so no series is identified by
colour alone.

### Fonts

Inter and Vazirmatn load from Google Fonts in `client/index.html`, with
`preconnect` and `display=swap`. Persian selection is one rule - `html[lang='fa']`
redefines `--font-sans` to the Vazirmatn stack - so every `font-sans` element
follows without touching a single component.

### Effect on deployment

None. The i18n layer is a React context written in this repo, so `client/package.json`
gained no dependency and the Vercel install and build steps are byte-for-byte what
they were. The fonts are two `<link>` tags in the static HTML.

The Jalali calendar is the same story: it comes from `Intl.DateTimeFormat`, which every
target browser and the Node version Vercel builds with already carry, so no date library
was added either. The layout rules are plain CSS and one `@custom-variant`, which Tailwind
compiles into the same stylesheet it was already emitting.

---

## 5. Deploy to Vercel

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

