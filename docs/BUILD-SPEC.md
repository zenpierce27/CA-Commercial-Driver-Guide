# BUILD-SPEC: CA Commercial Driver Guide v2

> **Audience:** A developer or AI builder (e.g., Claude Code) building this app cold from this spec. Do not deviate from the stack/data model decisions without flagging them. Content authoring (questions, lesson copy) is a separate workstream — the spec defines schemas, not content.

---

## 0. TL;DR

Build an **open-source, content-driven, mobile-first PWA** for studying for the **California Class A CDL** (with T and N endorsements; Hazmat explicitly excluded). Stack: **Astro 4 + Tailwind + React islands + Dexie (IndexedDB) + Supabase (deferred to v1.1)**. Anonymous-first — no auth required to study. Deploys to **GitHub Pages** via the existing workflow on the `main` branch.

**Repo:** `zenpierce27/CA-Commercial-Driver-Guide` (public). Build on the `v2` branch; merge to `main` when v2 reaches feature parity with v0 + the new features below.

---

## 1. Goals & non-goals

### Goals (v1 / this build)

1. Cover 5 modules: General Knowledge, Combination Vehicles, Air Brakes, Doubles & Triples (T), Tank Vehicles (N).
2. **Lesson reading mode** per module — handbook content as structured Markdown.
3. **Question engine** with three modes: Learn (immediate feedback), Exam (timed, scored at end), Challenge Bank (missed questions only).
4. **Multiple test sets per module** — Test 1, Test 2, Test 3. Drawn from the bank, no repeats within a session.
5. **Subtopic tagging** — every question carries a subtopic; weak-spots surfaces by subtopic, not just by module.
6. **Pre-trip walkaround flashcards** — preserve from v0, expand subtopic taxonomy.
7. **In-cab air brake script drill** — ordered text recital. User reads each line; reveal next line on tap. Track completion. **No voice mode in v1.**
8. **Progress dashboard** — per-module mastery, per-subtopic mastery, recent attempts.
9. **PWA** — installable to home screen, offline-capable, service-worker cached.
10. **Citations** — every question and lesson cites the source handbook section.

### Non-goals (defer to v1.1+)

- Multi-user auth and cross-device progress sync (Supabase) → v1.1
- Voice mode (Web Speech API) → v1.2
- AI explanations (server-side Claude API) → v1.2
- Embedded video or animations → v2 (content workstream)
- Diagrams and illustrations → v2 (content workstream)
- Multi-state support (other DMV handbooks) → future
- Drag-and-order interaction for coupling steps → v1.1 (text-ordered version is in v1)

---

## 2. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Astro 4** (latest stable) | Content-first, static + islands, excellent for OSS contributors editing content. Already familiar from sac-ai-hub. |
| UI library | **React 18** (in islands) | Interactive components (quiz, walkaround, progress dashboard) only. Most pages are static HTML. |
| Styling | **Tailwind CSS** (via `@astrojs/tailwind`) | Continuity with v0 design language. |
| Markdown | Astro's built-in **content collections** | Lessons authored as `.md` / `.mdx`. Type-safe with Zod schemas. |
| Local state | **Dexie** (IndexedDB wrapper) | Better DX than raw IndexedDB; same data model the v0 already uses. |
| Future server state | **Supabase** | Deferred to v1.1. Schema sketched in §10 for forward-compat. |
| Animations | **Framer Motion** (sparingly) | Quiz transitions, walkaround flips. |
| Icons | **lucide-react** | Lightweight, tree-shakeable. |
| Deploy | **GitHub Pages** (existing workflow) | Already set up; just point at the new build output. |
| Package manager | **npm** (default) | Consistent with sac-ai-hub. |
| Node version | **20** (matches existing workflow) | |

**Do NOT add:** Next.js, Remix, SvelteKit, Vue, separate routing libraries (Astro routes are the routing), CSS-in-JS libraries, Redux/Zustand (Dexie + React state is sufficient).

---

## 3. Project structure

```
.
├── .github/workflows/deploy.yml          # already exists; update build step (npm run build) and artifact path (dist/)
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── public/
│   ├── icons/                            # PWA icons (SVG + PNG)
│   ├── manifest.webmanifest
│   └── sw.js                             # service worker
├── src/
│   ├── content/
│   │   ├── config.ts                     # content collection schemas
│   │   ├── lessons/                      # .md files
│   │   │   ├── general-knowledge/
│   │   │   ├── combination-vehicles/
│   │   │   ├── air-brakes/
│   │   │   ├── doubles-triples/
│   │   │   └── tank-vehicles/
│   │   ├── questions/                    # .json files per bank
│   │   │   ├── general-knowledge.json
│   │   │   ├── combination-vehicles.json
│   │   │   ├── air-brakes.json
│   │   │   ├── doubles-triples.json
│   │   │   └── tank-vehicles.json
│   │   ├── walkaround/
│   │   │   └── cards.json                # pre-trip flashcards
│   │   └── scripts/
│   │       └── air-brake-incab.json      # in-cab recital script lines
│   ├── data/
│   │   └── modules.ts                    # module metadata (id, name, test counts, etc.)
│   ├── lib/
│   │   ├── db.ts                         # Dexie database
│   │   ├── progress.ts                   # progress queries (record answer, get weak subtopics, etc.)
│   │   ├── quiz.ts                       # quiz session logic (shuffle, score, etc.)
│   │   └── types.ts                      # TS types
│   ├── components/
│   │   ├── react/                        # interactive (islands)
│   │   │   ├── QuizEngine.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── ResultsScreen.tsx
│   │   │   ├── WalkaroundDeck.tsx
│   │   │   ├── ScriptDrill.tsx
│   │   │   ├── ProgressDashboard.tsx
│   │   │   └── ProgressBar.tsx
│   │   └── astro/                        # static
│   │       ├── Header.astro
│   │       ├── Footer.astro
│   │       ├── ModuleCard.astro
│   │       └── HandbookCitation.astro
│   ├── layouts/
│   │   └── Base.astro
│   ├── pages/
│   │   ├── index.astro                   # home
│   │   ├── study/
│   │   │   ├── [module]/index.astro      # module home
│   │   │   └── [module]/[lesson].astro   # lesson reading
│   │   ├── practice/
│   │   │   ├── [module]/index.astro      # test set selection
│   │   │   └── [module]/[set].astro      # active practice test
│   │   ├── exam/
│   │   │   └── mock.astro                # mock exam
│   │   ├── drill/
│   │   │   └── weak-spots.astro
│   │   ├── walkaround.astro
│   │   ├── in-cab-script.astro
│   │   └── progress.astro
│   └── styles/
│       └── global.css
├── docs/
│   └── BUILD-SPEC.md                     # this file
├── README.md
└── LICENSE                               # MIT
```

---

## 4. Data model

### 4.1 Content collections (Astro/Zod)

Located in `src/content/config.ts`. Astro's content collections give us type-safe Markdown and JSON.

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const lessonSchema = z.object({
  module: z.enum(['general-knowledge','combination-vehicles','air-brakes','doubles-triples','tank-vehicles']),
  lessonGroup: z.string(),                     // e.g. "B" or "B. Stability & Handling"
  title: z.string(),
  order: z.number(),                           // ordering within module
  objectives: z.array(z.string()),
  handbookRefs: z.array(z.string()),           // e.g. ["DL-650 §7.1", "DL-650 §7.2"]
  estimatedReadMin: z.number().optional(),
  hasMedia: z.boolean().default(false),        // future flag for diagrams/video
});

const questions = defineCollection({
  type: 'data',
  schema: z.array(z.object({
    id: z.string(),                            // e.g. "gk-001"
    module: z.enum(['general-knowledge','combination-vehicles','air-brakes','doubles-triples','tank-vehicles']),
    subtopic: z.string(),                      // e.g. "stability-rollover", "in-cab-leakage-test"
    type: z.enum(['multiple-choice','multi-select','scenario']).default('multiple-choice'),
    set: z.number().int().min(1),              // 1, 2, or 3 — which practice test
    difficulty: z.enum(['easy','medium','hard']).default('medium'),
    question: z.string(),
    choices: z.array(z.string()).min(2).max(6),
    correct: z.union([z.number(), z.array(z.number())]),  // index or array of indices
    explanation: z.string(),
    citation: z.string(),                      // e.g. "DL-650 §5.3"
  })),
});

const walkaround = defineCollection({
  type: 'data',
  schema: z.array(z.object({
    id: z.string(),
    area: z.string(),                          // "11M.5.2 — Steering Axle"
    item: z.string(),                          // "Steer tire condition"
    subtopic: z.string(),                      // "tires", "brakes", "steering", "coupling"
    whatToCheck: z.string(),
    why: z.string().optional(),
  })),
});

const scripts = defineCollection({
  type: 'data',
  schema: z.array(z.object({
    id: z.string(),
    title: z.string(),                         // e.g. "Air Brake Check (in-cab)"
    description: z.string(),
    lines: z.array(z.object({
      n: z.number(),
      action: z.string(),                      // what to do
      callOut: z.string(),                     // what to say to the examiner
      note: z.string().optional(),             // explanation
    })),
  })),
});

export const collections = { lessons: defineCollection({type:'content', schema: lessonSchema}), questions, walkaround, scripts };
```

### 4.2 Local state schema (Dexie)

Located in `src/lib/db.ts`.

```typescript
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface Answer {
  id?: number;
  questionId: string;
  module: string;
  subtopic: string;
  correct: boolean;
  ts: number;
}

export interface Attempt {
  id?: number;
  type: 'practice' | 'mock' | 'weak-spots' | 'walkaround';
  module?: string;
  set?: number;
  total: number;
  correct: number;
  missedIds: string[];
  durationSec: number;
  ts: number;
}

export interface ScriptRun {
  id?: number;
  scriptId: string;
  completedLines: number;
  totalLines: number;
  ts: number;
}

export interface Settings {
  key: string;
  value: any;
}

export class CdlDatabase extends Dexie {
  answers!: Table<Answer, number>;
  attempts!: Table<Attempt, number>;
  scriptRuns!: Table<ScriptRun, number>;
  settings!: Table<Settings, string>;

  constructor() {
    super('cdl-study-v2');
    this.version(1).stores({
      answers: '++id, questionId, module, subtopic, ts',
      attempts: '++id, type, module, ts',
      scriptRuns: '++id, scriptId, ts',
      settings: 'key',
    });
  }
}

export const db = new CdlDatabase();
```

### 4.3 Subtopic taxonomy

Subtopics are the unit of mastery. Each module has 4–6 subtopics. **Authoring rule:** every question must carry exactly one subtopic from this list. Lessons may carry multiple.

```typescript
// src/data/subtopics.ts
export const SUBTOPICS = {
  'general-knowledge': [
    'cdl-eligibility',          // who needs a CDL, age, ELDT, CLP
    'driver-fitness',            // medical, alcohol, disqualifications
    'inspection-basics',         // pre-trip generally
    'basic-control',             // steering, shifting, backing
    'space-management',          // following distance, lane choice
    'speed-control',             // braking, mountains, weather
    'hazards-emergencies',       // fires, accidents, hazmat awareness
    'cargo-securement',          // weight, balance, tie-downs
  ],
  'combination-vehicles': [
    'off-tracking-turning',
    'jackknife-skids',
    'air-system-combination',    // tractor protection, glad hands
    'coupling-uncoupling',
    'inspection-combination',
    'driving-combinations',      // braking, ABS, empty vs loaded
  ],
  'air-brakes': [
    'system-components',
    'dual-system-warnings',
    'inspection-air-brakes',
    'in-cab-leakage-test',
    'in-cab-low-air-warning',
    'in-cab-spring-brake-popout',
    'in-cab-buildup-governor',
    'safe-driving-air-brakes',   // brake fade, snub vs stab, downhill
  ],
  'doubles-triples': [
    'basics-legal',
    'stability-rollover',        // crack the whip
    'off-tracking-doubles',
    'coupling-uncoupling-doubles',
    'inspection-doubles',
    'driving-doubles',           // wind, lane, downhill
  ],
  'tank-vehicles': [
    'tank-definition',
    'inspection-tank',           // leaks, valves, fittings
    'liquid-surge',
    'outage-expansion',
    'high-cog-rollover',
    'driving-tankers',           // speed, ramps, stopping distance
    'emergencies-special-rules',
  ],
} as const;
```

### 4.4 Question type semantics

- **`multiple-choice`** — exactly one correct answer. `correct` is `number` (index).
- **`multi-select`** — 2+ correct answers. `correct` is `number[]` (sorted ascending). User must pick exactly the correct set to score.
- **`scenario`** — same as multiple-choice but rendered with a narrative preamble. Use a longer `question` string (multi-paragraph).

`set` (1, 2, or 3) is required. The bank is partitioned across sets; a Practice Test 1 pulls only `set === 1` questions, etc. **Coverage rule:** each set must include at least one question from every subtopic in that module.

---

## 5. Modules — metadata

```typescript
// src/data/modules.ts
export const MODULES = [
  { id: 'general-knowledge',     name: 'General Knowledge',      testLength: 50, passing: 0.8, sectionRefs: ['1','2','3','11','12','13'] },
  { id: 'air-brakes',            name: 'Air Brakes',             testLength: 25, passing: 0.8, sectionRefs: ['5'] },
  { id: 'combination-vehicles',  name: 'Combination Vehicles',   testLength: 20, passing: 0.8, sectionRefs: ['6'] },
  { id: 'doubles-triples',       name: 'Doubles / Triples (T)',  testLength: 20, passing: 0.8, sectionRefs: ['7'] },
  { id: 'tank-vehicles',         name: 'Tanker (N)',             testLength: 20, passing: 0.8, sectionRefs: ['8'] },
] as const;

export type ModuleId = typeof MODULES[number]['id'];
```

---

## 6. Routes (page-by-page contract)

| Route | Page | Purpose | Notes |
|-------|------|---------|-------|
| `/` | `pages/index.astro` | Home dashboard. Module tiles with mastery %. Tools section (walkaround, in-cab script, weak spots, mock exam). Recent activity. | Static HTML + small React island for mastery numbers (read from Dexie). |
| `/study/[module]` | `pages/study/[module]/index.astro` | Module landing. Lists lesson groups + their lessons. Links to practice tests for the module. | Static. Uses `getStaticPaths` over MODULES. |
| `/study/[module]/[lesson]` | `pages/study/[module]/[lesson].astro` | Lesson reading mode. Markdown rendered. Sidebar with handbook citations. "Mark as read" button. | Static; "mark as read" updates Dexie. |
| `/practice/[module]` | `pages/practice/[module]/index.astro` | Test set picker — Test 1, Test 2, Test 3. Shows previous score per set if any. | Static + island for prior-score lookup. |
| `/practice/[module]/[set]` | `pages/practice/[module]/[set].astro` | Active practice test. Drives `<QuizEngine />`. | Island. Mode = `practice`. Pulls `set === N` questions. |
| `/exam/mock` | `pages/exam/mock.astro` | Mock exam. 50 GK + 25 air brakes + 20 combination by default; user can configure mix. Timed. | Island. Mode = `mock`. |
| `/drill/weak-spots` | `pages/drill/weak-spots.astro` | Weak-spots drill. Pulls questions where subtopic mastery < 70%. | Island. Mode = `weak-spots`. |
| `/walkaround` | `pages/walkaround.astro` | Pre-trip flashcard deck. Tap to flip. Mark "got it" / "need more". | Island. |
| `/in-cab-script` | `pages/in-cab-script.astro` | Air brake in-cab recital drill. Reveal-line-by-line. | Island. Logs ScriptRun. |
| `/progress` | `pages/progress.astro` | Progress dashboard. Mastery by module + subtopic, recent attempts, missed-question history. | Island. |

---

## 7. Components

### 7.1 `<QuizEngine mode="practice" | "mock" | "weak-spots" module={...} set={...} />`

**Props:**
- `mode: 'practice' | 'mock' | 'weak-spots'`
- `module?: ModuleId` (required for `practice`)
- `set?: 1 | 2 | 3` (required for `practice`)

**Behavior:**
- On mount, build the question pool:
  - `practice`: `questions[module]` filtered to `set === N`, shuffled.
  - `mock`: configurable mix; default = 50 GK + 25 air brakes + 20 combination, all sets pooled, shuffled.
  - `weak-spots`: query Dexie for subtopics where mastery < 70%, pull up to 25 questions from those subtopics, shuffled.
- For each question, render `<QuestionCard />`.
- On answer, log to Dexie `answers` table, show feedback.
- After last question, log to Dexie `attempts` table, show `<ResultsScreen />`.
- Mock mode is **timed** (1-hour countdown for 50 GK; pro-rate for fewer questions). No timer for practice/weak-spots.

### 7.2 `<QuestionCard question={...} onAnswer={...} mode={...} />`

Renders all 3 question types:
- `multiple-choice`: radio-style buttons.
- `multi-select`: checkboxes; require user to click "Submit" (don't auto-advance).
- `scenario`: same as multiple-choice but with multi-paragraph narrative.

Shows feedback after answer (correct/incorrect, explanation, citation) **except in mock mode** (silent until end).

### 7.3 `<ResultsScreen attempt={...} questions={...} />`

- Big % score with pass/fail banner (≥80% = pass).
- Breakdown by subtopic.
- List of missed questions with correct answer + explanation.
- Buttons: Retry, Drill missed only (creates a new weak-spots-style session with just these), Home.

### 7.4 `<WalkaroundDeck />`

Loads `walkaround/cards.json`, shuffles. Tap to flip card. After flip, two buttons: "Got it" / "Need more practice". Logs result. Filterable by area/subtopic in v1.1.

### 7.5 `<ScriptDrill scriptId="air-brake-incab" />`

Loads `scripts/air-brake-incab.json`. Renders one line at a time. Each line shows:
- Step number
- Action (what to do physically)
- Call-out (exact words to say)
- Optional note (why)

User taps "Next" to reveal next line. After all lines, log ScriptRun. Provides a "Cheat sheet" mode that shows all lines at once for review.

### 7.6 `<ProgressDashboard />`

- Mastery bars per module (% correct on most-recent attempt at each question, weighted).
- Mastery bars per subtopic within each module (expandable).
- Recent attempts list (last 10).
- "Reset progress" button (with confirm dialog).

### 7.7 `<ProgressBar value={0..1} variant="amber" | "emerald" | "rose" />`

Shared atom.

---

## 8. Styling & design tokens

Same dark palette as v0:

```css
/* tokens */
--bg-primary: #0f172a       /* slate-950 */
--bg-secondary: #1e293b     /* slate-800 */
--border: #334155           /* slate-700 */
--text-primary: #f1f5f9     /* slate-100 */
--text-secondary: #94a3b8   /* slate-400 */
--accent: #f59e0b           /* amber-500 */
--success: #10b981          /* emerald-500 */
--error: #f43f5e            /* rose-500 */
```

Fonts: system stack (Tailwind default).

**Mobile-first.** Max content width: `max-w-3xl mx-auto`. Tap targets ≥ 44px.

---

## 9. PWA configuration

`public/manifest.webmanifest`:

```json
{
  "name": "CDL Study — CA Class A",
  "short_name": "CDL Study",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Service worker: cache shell, content JSON, lessons HTML on install. Stale-while-revalidate strategy for content. **Use `@vite-pwa/astro` plugin** — handles SW generation automatically.

---

## 10. Forward-compat: Supabase schema (v1.1, NOT BUILT IN v1)

Stub here so the v1 Dexie schema maps cleanly to Supabase later.

```sql
-- v1.1 — DO NOT BUILD IN v1
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  created_at timestamptz default now()
);

create table answers (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  question_id text not null,
  module text not null,
  subtopic text not null,
  correct boolean not null,
  ts timestamptz default now()
);
create index on answers (user_id, ts);
create index on answers (user_id, subtopic);

create table attempts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,        -- 'practice' | 'mock' | 'weak-spots' | 'walkaround'
  module text,
  set integer,
  total integer not null,
  correct integer not null,
  missed_ids text[] not null default '{}',
  duration_sec integer,
  ts timestamptz default now()
);

-- Migration path: on first sign-in, push local Dexie data to these tables, then mirror future writes.
```

---

## 11. Build & deploy

### 11.1 Local dev

```bash
npm install
npm run dev          # Astro dev server at http://localhost:4321
npm run build        # outputs to dist/
npm run preview      # preview the production build
```

### 11.2 GitHub Pages deploy

The existing `.github/workflows/deploy.yml` needs an update — currently it publishes `app/` directly. Update to:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### 11.3 Astro config

`astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  site: 'https://zenpierce27.github.io',
  base: '/CA-Commercial-Driver-Guide',
  output: 'static',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: true }),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: false,        // we ship manifest.webmanifest manually
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,json}'],
        runtimeCaching: [
          { urlPattern: /\.(?:json)$/, handler: 'StaleWhileRevalidate' },
        ],
      },
    }),
  ],
});
```

---

## 12. Implementation order (suggested)

A builder picking this up should ship in this order to get a usable app fastest:

1. **Project skeleton** — Astro init, Tailwind, base layout, header/footer, home page (no data yet).
2. **Data plumbing** — content collections defined, Dexie set up, types in place.
3. **Question seed** — port v0 question banks into the new schema. **Add `set` and `subtopic` fields** to every question (some will need new tagging — that's content work, not dev). Use the subtopic taxonomy in §4.3. Use `set: 1` for everything until we have 3× the questions; tag distribution in a follow-up.
4. **Walkaround seed** — port v0 walkaround JSON, add `subtopic` field.
5. **In-cab script seed** — author 1 script: `air-brake-incab.json`. Source: handbook §5 + 11M.1.2. Should be ~12-18 lines.
6. **QuizEngine + QuestionCard** — practice mode first, then mock, then weak-spots.
7. **ResultsScreen.**
8. **Module pages** (`/study/[module]`, `/practice/[module]`).
9. **WalkaroundDeck.**
10. **ScriptDrill.**
11. **Lesson reading mode** — port handbook content from PDFs into `.md` per lesson. (This is the largest content task; can be done in parallel with everything else by content authors.)
12. **ProgressDashboard.**
13. **PWA polish** — service worker, manifest, icons, offline test.

**v1 is "done" when:** all 5 modules have at least 1 set of practice questions (≥20 each), walkaround works, in-cab script works, weak-spots routing works, mock exam works, PWA installs offline, Lighthouse score ≥ 90 on mobile.

---

## 13. Content sourcing rules (for human or AI authoring)

- **Every question must cite a specific section of DL-650 or the 2023 modernized supplement (DL-650-X).** Format: `"DL-650 §5.3"` or `"DL-650-X 11M.5.2"`.
- **Subtopic must be from the taxonomy in §4.3.** Don't invent new subtopics without updating that list.
- **Question stems are factual or short-scenario — never reproduce >1 sentence verbatim from the handbook.** Paraphrase and cite.
- **Distractors must be plausible** — wrong but believable to someone who half-studied. Avoid jokes, "all of the above", "none of the above" as the answer.
- **Explanations should be 1–3 sentences.** State the correct answer, briefly explain why, point to the handbook section.
- **The DMV question pool is not public.** These questions train the same concepts the test will test, but are not the actual test questions. State this in the README.

---

## 14. Open questions for the builder

These are punts that need a decision during implementation:

1. **`@vite-pwa/astro` vs hand-rolled service worker** — spec assumes the plugin; if it's flaky on the GitHub Pages base path, fall back to hand-rolled.
2. **Confetti/celebration on passing mock exam** — out of scope for v1; can add in 30 minutes if you want delight.
3. **Dark / light theme toggle** — defer. Default dark.
4. **Spaced repetition algorithm for weak-spots** — v1 is "show questions where mastery < 70%". v1.1 can introduce SM-2 or similar.
5. **What's a question's "mastery"?** Operating definition for v1: `(correct answers in last 3 attempts) / (last 3 attempts)`. New questions are 0% until first answered.

---

## 15. Out of scope (do not implement)

- User accounts, login, sign-up
- Voice input / speech recognition
- Embedded video
- Drag-and-drop interactions
- Server-side rendering
- API routes
- Server-side AI calls
- Anything requiring a backend

If a feature in this doc reads like it needs a backend, treat it as v1.1+ and stub the UI.
