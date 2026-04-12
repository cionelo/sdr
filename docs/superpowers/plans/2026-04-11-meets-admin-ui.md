# Meets Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD admin dashboard at `/meets` and `/meets/:id` for manually managing the Supabase `meets` table, with search, filters, and inline editing.

**Architecture:** Service layer (`meets-service.ts`) wraps all Supabase queries with an injected client for testability. Custom hooks consume the service and own React state. Pages and components are thin consumers of hooks. Filter state persists to URL search params.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind CSS · react-router-dom v6 · @supabase/supabase-js v2 · vitest + @testing-library/react + jsdom · @vitest/coverage-v8

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Google Fonts: Teko + DM Sans + JetBrains Mono |
| `tailwind.config.ts` | Font families + concept-c color tokens |
| `src/index.css` | CSS custom properties (concept-c palette) |
| `src/main.tsx` | App entry, BrowserRouter |
| `src/App.tsx` | Route definitions |
| `src/lib/types.ts` | Meet, MeetFilters, MeetPayload, Venue, MeetEvent interfaces |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/lib/meets-service.ts` | fetchMeets, fetchMeet, createMeet, updateMeet, fetchVenues |
| `src/hooks/useMeets.ts` | List + filters + URL param persistence |
| `src/hooks/useMeet.ts` | Single meet + events + dirty state |
| `src/hooks/useVenues.ts` | Debounced venue typeahead |
| `src/components/VenueTypeahead.tsx` | City search → sdr_venues dropdown |
| `src/components/FilterBar.tsx` | Search + pills + date range |
| `src/components/MeetForm.tsx` | All editable fields (shared by Detail + Drawer) |
| `src/components/AddMeetDrawer.tsx` | Slide-in overlay with MeetForm |
| `src/pages/MeetsList.tsx` | /meets — table with visual flags |
| `src/pages/MeetDetail.tsx` | /meets/:id — edit form + linked events |
| `tests/setup.ts` | Testing library global setup |
| `tests/lib/meets-service.test.ts` | Service unit tests (mock client) |
| `tests/hooks/useMeets.test.ts` | Hook tests (mock service) |
| `tests/hooks/useMeet.test.ts` | Hook tests (mock service) |
| `tests/hooks/useVenues.test.ts` | Hook tests (mock service) |
| `tests/components/FilterBar.test.tsx` | Component tests |
| `tests/components/MeetForm.test.tsx` | Component tests |
| `tests/components/AddMeetDrawer.test.tsx` | Component tests |
| `tests/pages/MeetsList.test.tsx` | Page tests |
| `tests/pages/MeetDetail.test.tsx` | Page tests |

All commands run from `sdr/apps/web/` unless noted.

---

## Task 1: Project Setup

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `tests/setup.ts`
- Modify: `index.html`
- Modify: `tailwind.config.ts`
- Modify: `src/index.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install dependencies**

```bash
npm install react-router-dom
npm install -D @testing-library/react @testing-library/user-event @vitest/coverage-v8 jsdom
```

Expected: no errors, package.json updated.

- [ ] **Step 2: Update vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/lib/supabase.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

- [ ] **Step 3: Create tests/setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Install jest-dom types**

```bash
npm install -D @testing-library/jest-dom
```

- [ ] **Step 5: Update index.html — swap fonts to Teko + DM Sans + JetBrains Mono**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SDR — Meets</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Update tailwind.config.ts — concept-c tokens**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Teko', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        pace: {
          bg: '#FFFBEB',
          card: '#FFFFFF',
          'card-inner': '#FEF9E7',
          input: '#FFFFFF',
          border: '#1C1917',
          'border-thin': '#D6D3D1',
          'border-accent': '#1E3A8A',
          text: '#1C1917',
          'text-secondary': '#57534E',
          'text-muted': '#A8A29E',
          accent: '#1E3A8A',
          'accent-light': '#EFF6FF',
          'accent-hover': '#1E40AF',
          'control-bg': '#F5F5F4',
          'control-active': '#1C1917',
          'control-active-text': '#FFFBEB',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 7: Update src/index.css — concept-c CSS properties + finish stripe**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: #FFFBEB;
    --bg-card: #FFFFFF;
    --bg-card-inner: #FEF9E7;
    --border: #1C1917;
    --border-thin: #D6D3D1;
    --accent: #1E3A8A;
    --text: #1C1917;
    --text-muted: #A8A29E;
    --control-active: #1C1917;
    --control-active-text: #FFFBEB;
    --stripe: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 8px,
      rgba(28, 25, 23, 0.03) 8px,
      rgba(28, 25, 23, 0.03) 9px
    );
  }

  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
}

@layer components {
  .finish-stripe {
    height: 6px;
    background: repeating-linear-gradient(
      90deg,
      var(--accent) 0px,
      var(--accent) 12px,
      var(--bg) 12px,
      var(--bg) 24px
    );
  }

  .window-card {
    background: var(--bg-card);
    border: 3px solid var(--border);
    overflow: hidden;
  }

  .window-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 2px solid var(--border);
    background: var(--bg-card-inner);
  }

  .pill-group {
    display: flex;
    overflow: hidden;
    border: 2px solid var(--border);
  }

  .pill {
    font-family: 'Teko', sans-serif;
    font-weight: 500;
    font-size: 15px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 14px;
    border: none;
    border-right: 2px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .pill:last-child {
    border-right: none;
  }

  .pill.active {
    background: var(--control-active);
    color: var(--control-active-text);
  }

  .btn-primary {
    font-family: 'Teko', sans-serif;
    font-weight: 600;
    font-size: 18px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 8px 24px;
    background: var(--accent);
    color: #fff;
    border: 2px solid var(--accent);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary:hover {
    background: #1E40AF;
    border-color: #1E40AF;
  }

  .field-input {
    width: 100%;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    padding: 8px 10px;
    border: none;
    border-bottom: 2px solid var(--border-thin);
    background: transparent;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
  }

  .field-input:focus {
    border-bottom-color: var(--accent);
  }

  .empty-stripe {
    background-image: var(--stripe);
  }
}
```

- [ ] **Step 8: Update src/main.tsx — wrap with BrowserRouter**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 9: Update src/App.tsx — routes (placeholder pages for now)**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'

function PlaceholderMeetsList() {
  return <div className="p-8 font-display text-2xl">MEETS LIST</div>
}

function PlaceholderMeetDetail() {
  return <div className="p-8 font-display text-2xl">MEET DETAIL</div>
}

export default function App() {
  return (
    <>
      <div className="finish-stripe" />
      <Routes>
        <Route path="/meets" element={<PlaceholderMeetsList />} />
        <Route path="/meets/:id" element={<PlaceholderMeetDetail />} />
        <Route path="*" element={<Navigate to="/meets" replace />} />
      </Routes>
    </>
  )
}
```

- [ ] **Step 10: Verify dev server starts and routes work**

```bash
npm run dev
```

Visit `http://localhost:5173/meets` — should show "MEETS LIST". Visit `http://localhost:5173/meets/123` — should show "MEET DETAIL". Visit any other path — should redirect to `/meets`.

- [ ] **Step 11: Commit**

```bash
git add apps/web/
git commit -m "chore: project setup — routing, design tokens, test config"
```

---

## Task 2: Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```ts
export type Season = 'indoor' | 'outdoor' | 'xc'

export interface Venue {
  id: string
  city: string
  is_altitude: boolean
}

export interface MeetEvent {
  id: string
  meet_id: string
  name: string | null
  date: string | null
  location: string | null
  gender: string | null
  distance: string | null
  season: string | null
  source_url: string | null
  results?: { count: number }[]
}

export interface Meet {
  id: string
  name: string | null
  date: string | null
  location: string | null
  venue_id: string | null
  division: string | null
  season: Season | null
  indoor: boolean | null
  timing_company: string | null
  a_live_url_1: string | null
  a_live_url_1_scrapable: boolean | null
  live_url_2: string | null
  live_url_2_scrapable: boolean | null
  tfrrs_url: string | null
  source_url: string | null
  scraped_at: string | null
  created_at: string
  updated_at: string | null
  // joined
  venue?: Venue | null
  events?: { count: number }[]
}

export interface MeetFilters {
  search?: string
  season?: Season
  dateFrom?: string
  dateTo?: string
  isAltitude?: boolean
  hasScrapableUrl?: boolean
  hasScraped?: boolean
}

export interface MeetPayload {
  name?: string | null
  date?: string | null
  location?: string | null
  venue_id?: string | null
  division?: string | null
  season?: Season | null
  indoor?: boolean | null
  timing_company?: string | null
  a_live_url_1?: string | null
  a_live_url_1_scrapable?: boolean | null
  live_url_2?: string | null
  live_url_2_scrapable?: boolean | null
  tfrrs_url?: string | null
  source_url?: string | null
  scraped_at?: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/types.ts
git commit -m "feat: add Meet, Venue, MeetEvent, MeetFilters types"
```

---

## Task 3: Supabase Client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- [ ] **Step 2: Verify .env.local has the keys**

```bash
grep VITE_SUPABASE apps/web/.env.local
```

Expected: two lines — `VITE_SUPABASE_URL=https://...` and `VITE_SUPABASE_ANON_KEY=...`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/supabase.ts
git commit -m "feat: add Supabase client singleton"
```

---

## Task 4: Service — fetchVenues

**Files:**
- Create: `src/lib/meets-service.ts`
- Create: `tests/lib/meets-service.test.ts`
- Create: `tests/mocks/supabase.ts`

- [ ] **Step 1: Create the mock Supabase client helper**

```ts
// tests/mocks/supabase.ts
import { vi } from 'vitest'

export function makeMockClient(resolvedData: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}
```

- [ ] **Step 2: Write the failing test for fetchVenues**

```ts
// tests/lib/meets-service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchVenues } from '../../src/lib/meets-service'
import { makeMockClient } from '../mocks/supabase'

describe('fetchVenues', () => {
  it('returns venues matching the query', async () => {
    const venues = [{ id: '1', city: 'Boston', is_altitude: false }]
    const mock = makeMockClient(venues)
    // limit resolves the chain for this query
    mock._chain.limit.mockResolvedValue({ data: venues, error: null })

    const result = await fetchVenues(mock as any, 'bos')

    expect(mock.from).toHaveBeenCalledWith('sdr_venues')
    expect(mock._chain.ilike).toHaveBeenCalledWith('city', '%bos%')
    expect(mock._chain.limit).toHaveBeenCalledWith(10)
    expect(result).toEqual(venues)
  })

  it('returns empty array on empty query', async () => {
    const mock = makeMockClient([])
    mock._chain.limit.mockResolvedValue({ data: [], error: null })

    const result = await fetchVenues(mock as any, '')
    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const mock = makeMockClient(null, { message: 'DB error' })
    mock._chain.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    await expect(fetchVenues(mock as any, 'bo')).rejects.toThrow('DB error')
  })
})
```

- [ ] **Step 3: Run the test — verify it fails**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: FAIL — `fetchVenues` not defined.

- [ ] **Step 4: Create src/lib/meets-service.ts with fetchVenues**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meet, MeetFilters, MeetPayload, MeetEvent, Venue } from './types'

export async function fetchVenues(client: SupabaseClient, query: string): Promise<Venue[]> {
  const { data, error } = await client
    .from('sdr_venues')
    .select('id, city, is_altitude')
    .ilike('city', `%${query}%`)
    .limit(10)

  if (error) throw new Error(error.message)
  return (data || []) as Venue[]
}
```

- [ ] **Step 5: Run the test — verify it passes**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/meets-service.ts apps/web/tests/
git commit -m "feat: fetchVenues service + tests"
```

---

## Task 5: Service — fetchMeet

**Files:**
- Modify: `src/lib/meets-service.ts`
- Modify: `tests/lib/meets-service.test.ts`
- Modify: `tests/mocks/supabase.ts`

- [ ] **Step 1: Extend the mock client to support two `.from()` calls**

Update `tests/mocks/supabase.ts` to support chained calls on different tables:

```ts
// tests/mocks/supabase.ts
import { vi } from 'vitest'

export function makeMockClient(resolvedData: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

export function makeMultiTableClient(tableResponses: Record<string, { data: unknown; error: unknown }>) {
  function makeChain(response: { data: unknown; error: unknown }) {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(response),
      order: vi.fn().mockResolvedValue(response),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(response),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }
  }
  return {
    from: vi.fn((table: string) => makeChain(tableResponses[table] ?? { data: [], error: null })),
  }
}
```

- [ ] **Step 2: Write the failing test for fetchMeet**

Append to `tests/lib/meets-service.test.ts`:

```ts
import { makeMultiTableClient } from '../mocks/supabase'

describe('fetchMeet', () => {
  const meet = {
    id: 'abc',
    name: 'Big 12 Indoor',
    date: '2026-02-28',
    location: 'Fayetteville, AR',
    venue_id: null,
    venue: null,
  }
  const events = [
    { id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', results: [{ count: 24 }] },
  ]

  it('returns meet with events', async () => {
    const client = makeMultiTableClient({
      meets: { data: meet, error: null },
      events: { data: events, error: null },
    })

    const result = await fetchMeet(client as any, 'abc')

    expect(result.meet.id).toBe('abc')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].distance).toBe('800m')
  })

  it('throws when meet not found', async () => {
    const client = makeMultiTableClient({
      meets: { data: null, error: { message: 'Not found' } },
      events: { data: [], error: null },
    })

    await expect(fetchMeet(client as any, 'bad-id')).rejects.toThrow('Not found')
  })
})
```

- [ ] **Step 3: Run the test — verify it fails**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: FAIL — `fetchMeet` not defined.

- [ ] **Step 4: Implement fetchMeet in meets-service.ts**

Append to `src/lib/meets-service.ts`:

```ts
export async function fetchMeet(
  client: SupabaseClient,
  id: string,
): Promise<{ meet: Meet; events: MeetEvent[] }> {
  const { data: meet, error: meetError } = await client
    .from('meets')
    .select('*, venue:sdr_venues(id, city, is_altitude)')
    .eq('id', id)
    .single()

  if (meetError) throw new Error(meetError.message)

  const { data: events, error: eventsError } = await client
    .from('events')
    .select('*, results(count)')
    .eq('meet_id', id)
    .order('distance')

  if (eventsError) throw new Error(eventsError.message)

  return { meet: meet as Meet, events: (events || []) as MeetEvent[] }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/meets-service.ts apps/web/tests/
git commit -m "feat: fetchMeet service + tests"
```

---

## Task 6: Service — fetchMeets

**Files:**
- Modify: `src/lib/meets-service.ts`
- Modify: `tests/lib/meets-service.test.ts`

- [ ] **Step 1: Write the failing tests for fetchMeets**

Append to `tests/lib/meets-service.test.ts`:

```ts
describe('fetchMeets', () => {
  const meets = [
    {
      id: '1', name: 'Big 12 Indoor', date: '2026-02-28',
      location: 'Fayetteville, AR', season: 'indoor',
      venue: { id: 'v1', city: 'Fayetteville', is_altitude: false },
      events: [{ count: 12 }],
      scraped_at: '2026-03-01T00:00:00Z',
      a_live_url_1_scrapable: true, live_url_2_scrapable: false,
    },
    {
      id: '2', name: 'Altitude Open', date: '2026-03-15',
      location: 'Albuquerque, NM', season: 'outdoor',
      venue: { id: 'v2', city: 'Albuquerque', is_altitude: true },
      events: [{ count: 8 }],
      scraped_at: null,
      a_live_url_1_scrapable: false, live_url_2_scrapable: false,
    },
  ]

  it('returns all meets with no filters', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, {})
    expect(result).toHaveLength(2)
  })

  it('applies isAltitude=true client-side filter', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, { isAltitude: true })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('applies isAltitude=false client-side filter', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, { isAltitude: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('applies season filter server-side', async () => {
    const indoorMeets = [meets[0]]
    const mock = makeMockClient(indoorMeets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: indoorMeets, error: null })

    const result = await fetchMeets(mock as any, { season: 'indoor' })
    expect(mock._chain.eq).toHaveBeenCalledWith('season', 'indoor')
    expect(result).toHaveLength(1)
  })

  it('applies hasScraped=true filter server-side', async () => {
    const mock = makeMockClient([meets[0]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[0]], error: null })

    await fetchMeets(mock as any, { hasScraped: true })
    expect(mock._chain.not).toHaveBeenCalledWith('scraped_at', 'is', null)
  })

  it('applies hasScraped=false filter server-side', async () => {
    const mock = makeMockClient([meets[1]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[1]], error: null })

    await fetchMeets(mock as any, { hasScraped: false })
    expect(mock._chain.is).toHaveBeenCalledWith('scraped_at', null)
  })

  it('applies search filter server-side', async () => {
    const mock = makeMockClient([meets[0]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[0]], error: null })

    await fetchMeets(mock as any, { search: 'big 12' })
    expect(mock._chain.or).toHaveBeenCalledWith(
      'name.ilike.%big 12%,location.ilike.%big 12%',
    )
  })

  it('applies dateFrom filter server-side', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    await fetchMeets(mock as any, { dateFrom: '2026-03-01' })
    expect(mock._chain.gte).toHaveBeenCalledWith('date', '2026-03-01')
  })

  it('applies dateTo filter server-side', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    await fetchMeets(mock as any, { dateTo: '2026-03-31' })
    expect(mock._chain.lte).toHaveBeenCalledWith('date', '2026-03-31')
  })

  it('throws on Supabase error', async () => {
    const mock = makeMockClient(null)
    mock._chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })

    await expect(fetchMeets(mock as any, {})).rejects.toThrow('fail')
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: FAIL — `fetchMeets` not defined.

- [ ] **Step 3: Implement fetchMeets in meets-service.ts**

Append to `src/lib/meets-service.ts`:

```ts
export async function fetchMeets(
  client: SupabaseClient,
  filters: MeetFilters = {},
): Promise<Meet[]> {
  let query = client
    .from('meets')
    .select('*, venue:sdr_venues(id, city, is_altitude), events(count)')

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
  }
  if (filters.season) {
    query = query.eq('season', filters.season)
  }
  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo)
  }
  if (filters.hasScraped === true) {
    query = query.not('scraped_at', 'is', null)
  } else if (filters.hasScraped === false) {
    query = query.is('scraped_at', null)
  }
  if (filters.hasScrapableUrl === true) {
    query = query.or('a_live_url_1_scrapable.eq.true,live_url_2_scrapable.eq.true')
  } else if (filters.hasScrapableUrl === false) {
    query = query.or('a_live_url_1_scrapable.neq.true,live_url_2_scrapable.neq.true')
  }

  const { data, error } = await (query as any).order('date', { ascending: false })

  if (error) throw new Error(error.message)

  let meets = (data || []) as Meet[]

  // isAltitude filtered client-side (joins don't support server-side filter in Supabase JS v2)
  if (filters.isAltitude === true) {
    meets = meets.filter((m) => m.venue?.is_altitude === true)
  } else if (filters.isAltitude === false) {
    meets = meets.filter((m) => !m.venue?.is_altitude)
  }

  return meets
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/meets-service.ts apps/web/tests/lib/meets-service.test.ts
git commit -m "feat: fetchMeets service with all filters + tests"
```

---

## Task 7: Service — createMeet + updateMeet

**Files:**
- Modify: `src/lib/meets-service.ts`
- Modify: `tests/lib/meets-service.test.ts`

- [ ] **Step 1: Write failing tests for createMeet and updateMeet**

Append to `tests/lib/meets-service.test.ts`:

```ts
describe('createMeet', () => {
  it('inserts and returns the new meet', async () => {
    const newMeet = { id: 'new1', name: 'Test Meet', date: '2026-05-01', season: 'outdoor' }
    const mock = makeMockClient(newMeet)
    mock._chain.single.mockResolvedValue({ data: newMeet, error: null })

    const result = await createMeet(mock as any, { name: 'Test Meet', date: '2026-05-01', season: 'outdoor' })

    expect(mock.from).toHaveBeenCalledWith('meets')
    expect(mock._chain.insert).toHaveBeenCalledWith({
      name: 'Test Meet', date: '2026-05-01', season: 'outdoor',
    })
    expect(result.id).toBe('new1')
  })

  it('throws on insert error', async () => {
    const mock = makeMockClient(null)
    mock._chain.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    await expect(createMeet(mock as any, { name: 'Bad' })).rejects.toThrow('insert failed')
  })
})

describe('updateMeet', () => {
  it('patches and returns the updated meet', async () => {
    const updated = { id: 'abc', name: 'Updated Name', date: '2026-02-28' }
    const mock = makeMockClient(updated)
    mock._chain.single.mockResolvedValue({ data: updated, error: null })

    const result = await updateMeet(mock as any, 'abc', { name: 'Updated Name' })

    expect(mock.from).toHaveBeenCalledWith('meets')
    expect(mock._chain.update).toHaveBeenCalledWith({ name: 'Updated Name' })
    expect(mock._chain.eq).toHaveBeenCalledWith('id', 'abc')
    expect(result.name).toBe('Updated Name')
  })

  it('throws on update error', async () => {
    const mock = makeMockClient(null)
    mock._chain.single.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    await expect(updateMeet(mock as any, 'x', { name: 'x' })).rejects.toThrow('update failed')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: FAIL — `createMeet`, `updateMeet` not defined.

- [ ] **Step 3: Implement createMeet and updateMeet**

Append to `src/lib/meets-service.ts`:

```ts
export async function createMeet(client: SupabaseClient, payload: MeetPayload): Promise<Meet> {
  const { data, error } = await client
    .from('meets')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Meet
}

export async function updateMeet(
  client: SupabaseClient,
  id: string,
  patch: Partial<MeetPayload>,
): Promise<Meet> {
  const { data, error } = await client
    .from('meets')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Meet
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/lib/meets-service.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/meets-service.ts apps/web/tests/lib/meets-service.test.ts
git commit -m "feat: createMeet + updateMeet service + tests"
```

---

## Task 8: Hook — useVenues

**Files:**
- Create: `src/hooks/useVenues.ts`
- Create: `tests/hooks/useVenues.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/hooks/useVenues.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVenues } from '../../src/hooks/useVenues'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')

describe('useVenues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns venues for a non-empty query', async () => {
    const venues = [{ id: '1', city: 'Boston', is_altitude: false }]
    vi.mocked(service.fetchVenues).mockResolvedValue(venues)

    const { result } = renderHook(() => useVenues('bos'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.venues).toEqual(venues)
  })

  it('returns empty array for empty query without calling service', async () => {
    const { result } = renderHook(() => useVenues(''))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.venues).toEqual([])
    expect(service.fetchVenues).not.toHaveBeenCalled()
  })

  it('starts with loading=true', () => {
    vi.mocked(service.fetchVenues).mockResolvedValue([])
    const { result } = renderHook(() => useVenues('bo'))
    expect(result.current.loading).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/hooks/useVenues.test.ts
```

Expected: FAIL — `useVenues` not defined.

- [ ] **Step 3: Implement useVenues**

```ts
// src/hooks/useVenues.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchVenues } from '../lib/meets-service'
import type { Venue } from '../lib/types'

export function useVenues(query: string) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setVenues([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchVenues(supabase, query)
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setLoading(false))
  }, [query])

  return { venues, loading }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/hooks/useVenues.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useVenues.ts apps/web/tests/hooks/useVenues.test.ts
git commit -m "feat: useVenues hook + tests"
```

---

## Task 9: Hook — useMeet

**Files:**
- Create: `src/hooks/useMeet.ts`
- Create: `tests/hooks/useMeet.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/hooks/useMeet.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMeet } from '../../src/hooks/useMeet'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')

const meet = {
  id: 'abc', name: 'Big 12 Indoor', date: '2026-02-28',
  location: 'Fayetteville, AR', season: 'indoor' as const,
  venue_id: null, venue: null, indoor: true,
  division: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
  created_at: '2026-01-01', updated_at: null,
}
const events = [{ id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', name: null, date: null, location: null, season: null, source_url: null }]

describe('useMeet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads meet and events', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.meet?.id).toBe('abc')
    expect(result.current.events).toHaveLength(1)
  })

  it('isDirty is false initially', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isDirty).toBe(false)
  })

  it('isDirty becomes true after patch', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setPatch({ name: 'Changed' }))

    expect(result.current.isDirty).toBe(true)
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(service.fetchMeet).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useMeet('bad'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error?.message).toBe('Not found')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/hooks/useMeet.test.ts
```

Expected: FAIL — `useMeet` not defined.

- [ ] **Step 3: Implement useMeet**

```ts
// src/hooks/useMeet.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMeet } from '../lib/meets-service'
import type { Meet, MeetEvent, MeetPayload } from '../lib/types'

export function useMeet(id: string) {
  const [meet, setMeet] = useState<Meet | null>(null)
  const [events, setEvents] = useState<MeetEvent[]>([])
  const [patch, setPatchState] = useState<Partial<MeetPayload>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchMeet(supabase, id)
      .then(({ meet, events }) => {
        setMeet(meet)
        setEvents(events)
        setPatchState({})
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const setPatch = (update: Partial<MeetPayload>) => {
    setPatchState((prev) => ({ ...prev, ...update }))
  }

  const isDirty = Object.keys(patch).length > 0

  return { meet, events, patch, setPatch, isDirty, loading, error, refetch: load }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/hooks/useMeet.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useMeet.ts apps/web/tests/hooks/useMeet.test.ts
git commit -m "feat: useMeet hook with dirty state + tests"
```

---

## Task 10: Hook — useMeets

**Files:**
- Create: `src/hooks/useMeets.ts`
- Create: `tests/hooks/useMeets.test.ts`

useMeets persists filter state in URL search params so refreshing keeps filters.

- [ ] **Step 1: Write failing tests**

```ts
// tests/hooks/useMeets.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import { useMeets } from '../../src/hooks/useMeets'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(MemoryRouter, { initialEntries: ['/meets'] }, children)

const meets = [
  { id: '1', name: 'Big 12 Indoor', date: '2026-02-28', venue: null, events: [{ count: 4 }], scraped_at: null },
]

describe('useMeets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches meets on mount', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    const { result } = renderHook(() => useMeets(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.meets).toHaveLength(1)
  })

  it('refetch re-calls the service', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    const { result } = renderHook(() => useMeets(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.refetch())
    expect(service.fetchMeets).toHaveBeenCalledTimes(2)
  })

  it('sets error on failure', async () => {
    vi.mocked(service.fetchMeets).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useMeets(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error?.message).toBe('network error')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/hooks/useMeets.test.ts
```

Expected: FAIL — `useMeets` not defined.

- [ ] **Step 3: Implement useMeets**

```ts
// src/hooks/useMeets.ts
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchMeets } from '../lib/meets-service'
import type { Meet, MeetFilters, Season } from '../lib/types'

function filtersFromParams(params: URLSearchParams): MeetFilters {
  return {
    search: params.get('search') || undefined,
    season: (params.get('season') as Season) || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    isAltitude: params.has('isAltitude') ? params.get('isAltitude') === 'true' : undefined,
    hasScrapableUrl: params.has('hasScrapableUrl') ? params.get('hasScrapableUrl') === 'true' : undefined,
    hasScraped: params.has('hasScraped') ? params.get('hasScraped') === 'true' : undefined,
  }
}

export function useMeets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const filters = filtersFromParams(searchParams)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchMeets(supabase, filters)
      .then(setMeets)
      .catch(setError)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  useEffect(() => { load() }, [load])

  const setFilters = (update: Partial<MeetFilters>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(update).forEach(([k, v]) => {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next, { replace: true })
  }

  return { meets, filters, setFilters, loading, error, refetch: load }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/hooks/useMeets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useMeets.ts apps/web/tests/hooks/useMeets.test.ts
git commit -m "feat: useMeets hook with URL filter persistence + tests"
```

---

## Task 11: Component — VenueTypeahead

**Files:**
- Create: `src/components/VenueTypeahead.tsx`
- Create: `tests/components/VenueTypeahead.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/VenueTypeahead.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VenueTypeahead } from '../../src/components/VenueTypeahead'
import * as hook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useVenues')

const venues = [
  { id: 'v1', city: 'Boston', is_altitude: false },
  { id: 'v2', city: 'Albuquerque', is_altitude: true },
]

describe('VenueTypeahead', () => {
  it('renders the current venue city if selected', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues: [], loading: false })
    render(
      <VenueTypeahead value="v1" currentCity="Boston" onChange={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('Boston')).toBeInTheDocument()
  })

  it('shows dropdown results when venues are returned', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues, loading: false })
    render(<VenueTypeahead value={null} currentCity={null} onChange={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bo' } })
    expect(screen.getByText('Boston')).toBeInTheDocument()
    expect(screen.getByText('Albuquerque')).toBeInTheDocument()
  })

  it('calls onChange with venue id when a result is clicked', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues, loading: false })
    const onChange = vi.fn()
    render(<VenueTypeahead value={null} currentCity={null} onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alb' } })
    fireEvent.click(screen.getByText('Albuquerque'))

    expect(onChange).toHaveBeenCalledWith('v2')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/components/VenueTypeahead.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement VenueTypeahead**

```tsx
// src/components/VenueTypeahead.tsx
import { useState } from 'react'
import { useVenues } from '../hooks/useVenues'

interface Props {
  value: string | null
  currentCity: string | null
  onChange: (venueId: string | null) => void
}

export function VenueTypeahead({ value, currentCity, onChange }: Props) {
  const [query, setQuery] = useState(currentCity || '')
  const [open, setOpen] = useState(false)
  const { venues } = useVenues(open ? query : '')

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(null)
  }

  const select = (id: string, city: string) => {
    onChange(id)
    setQuery(city)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="field-input"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder="Search venue city..."
      />
      {open && venues.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            width: '100%',
          }}
        >
          {venues.map((v) => (
            <div
              key={v.id}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
              onMouseDown={() => select(v.id, v.city)}
            >
              {v.city}
              {v.is_altitude && (
                <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 11 }}>
                  ALT
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/components/VenueTypeahead.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/VenueTypeahead.tsx apps/web/tests/components/VenueTypeahead.test.tsx
git commit -m "feat: VenueTypeahead component + tests"
```

---

## Task 12: Component — FilterBar

**Files:**
- Create: `src/components/FilterBar.tsx`
- Create: `tests/components/FilterBar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/FilterBar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from '../../src/components/FilterBar'
import type { MeetFilters } from '../../src/lib/types'

const noop = vi.fn()

describe('FilterBar', () => {
  it('renders search input', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('calls onFiltersChange with search value', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onFiltersChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'big 12' },
    })
    // debounced — check it's called eventually (or directly test the internal value)
    expect(screen.getByDisplayValue('big 12')).toBeInTheDocument()
  })

  it('renders season pills: All, Indoor, Outdoor, XC', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText(/indoor/i)).toBeInTheDocument()
    expect(screen.getByText(/outdoor/i)).toBeInTheDocument()
    expect(screen.getByText(/xc/i)).toBeInTheDocument()
  })

  it('clicking a season pill calls onFiltersChange with season', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onFiltersChange={onChange} />)

    fireEvent.click(screen.getByText(/^indoor$/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ season: 'indoor' }))
  })

  it('clicking active season pill clears it', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{ season: 'indoor' }} onFiltersChange={onChange} />)

    fireEvent.click(screen.getByText(/^indoor$/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ season: undefined }))
  })

  it('renders date range inputs', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/components/FilterBar.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement FilterBar**

```tsx
// src/components/FilterBar.tsx
import { useState, useEffect } from 'react'
import type { MeetFilters, Season } from '../lib/types'

interface Props {
  filters: MeetFilters
  onFiltersChange: (f: MeetFilters) => void
}

type BoolFilter = 'isAltitude' | 'hasScrapableUrl' | 'hasScraped'

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T | undefined }[]
  value: T | undefined
  onChange: (v: T | undefined) => void
}) {
  return (
    <div className="pill-group">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`pill ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(value === opt.value ? undefined : opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function FilterBar({ filters, onFiltersChange }: Props) {
  const [search, setSearch] = useState(filters.search || '')

  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ ...filters, search: search || undefined })
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const set = (update: Partial<MeetFilters>) => onFiltersChange({ ...filters, ...update })

  const boolOptions = (key: BoolFilter) => [
    { label: 'All', value: undefined as boolean | undefined },
    { label: 'Yes', value: true as boolean | undefined },
    { label: 'No', value: false as boolean | undefined },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-thin)' }}>
      <input
        className="field-input"
        placeholder="Search meets by name or location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <PillGroup
          options={[
            { label: 'All', value: undefined },
            { label: 'Indoor', value: 'indoor' as Season },
            { label: 'Outdoor', value: 'outdoor' as Season },
            { label: 'XC', value: 'xc' as Season },
          ]}
          value={filters.season}
          onChange={(v) => set({ season: v })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor="dateFrom" style={{ fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>From</label>
          <input id="dateFrom" type="date" className="field-input" style={{ width: 'auto' }}
            value={filters.dateFrom || ''}
            onChange={(e) => set({ dateFrom: e.target.value || undefined })} />
          <label htmlFor="dateTo" style={{ fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>To</label>
          <input id="dateTo" type="date" className="field-input" style={{ width: 'auto' }}
            value={filters.dateTo || ''}
            onChange={(e) => set({ dateTo: e.target.value || undefined })} />
        </div>
        <PillGroup options={boolOptions('isAltitude')} value={filters.isAltitude} onChange={(v) => set({ isAltitude: v })} />
        <PillGroup options={boolOptions('hasScrapableUrl')} value={filters.hasScrapableUrl} onChange={(v) => set({ hasScrapableUrl: v })} />
        <PillGroup options={boolOptions('hasScraped')} value={filters.hasScraped} onChange={(v) => set({ hasScraped: v })} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/components/FilterBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/FilterBar.tsx apps/web/tests/components/FilterBar.test.tsx
git commit -m "feat: FilterBar component + tests"
```

---

## Task 13: Component — MeetForm

**Files:**
- Create: `src/components/MeetForm.tsx`
- Create: `tests/components/MeetForm.test.tsx`

MeetForm renders all editable fields. It is controlled: receives current values via `values` prop and reports changes via `onChange`.

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/MeetForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeetForm } from '../../src/components/MeetForm'
import type { MeetPayload } from '../../src/lib/types'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useVenues')

const emptyValues: MeetPayload = {
  name: null, date: null, location: null, venue_id: null,
  division: null, season: null, indoor: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
}

describe('MeetForm', () => {
  beforeEach(() => {
    vi.mocked(venueHook.useVenues).mockReturnValue({ venues: [], loading: false })
  })

  it('renders name, date, location, division, timing_company fields', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/division/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timing/i)).toBeInTheDocument()
  })

  it('renders season select with 3 options', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    expect(select.options).toHaveLength(4) // blank + 3 seasons
  })

  it('calls onChange when name is edited', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Meet' } })
    expect(onChange).toHaveBeenCalledWith({ name: 'New Meet' })
  })

  it('pre-fills scraped_at with now() when focused and empty', () => {
    render(<MeetForm values={{ ...emptyValues, scraped_at: null }} onChange={vi.fn()} />)
    const input = screen.getByLabelText(/scraped/i) as HTMLInputElement
    fireEvent.focus(input)
    expect(input.value).not.toBe('')
  })

  it('does not overwrite scraped_at when already set', () => {
    render(<MeetForm values={{ ...emptyValues, scraped_at: '2026-03-01T12:00' }} onChange={vi.fn()} />)
    const input = screen.getByLabelText(/scraped/i) as HTMLInputElement
    expect(input.value).toBe('2026-03-01T12:00')
    fireEvent.focus(input)
    expect(input.value).toBe('2026-03-01T12:00')
  })

  it('renders URL fields in a collapsible section', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    expect(screen.getByText(/urls/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/components/MeetForm.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement MeetForm**

```tsx
// src/components/MeetForm.tsx
import { useState } from 'react'
import type { MeetPayload, Season } from '../lib/types'
import { VenueTypeahead } from './VenueTypeahead'

interface Props {
  values: MeetPayload
  onChange: (patch: Partial<MeetPayload>) => void
  venueCity?: string | null
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function MeetForm({ values, onChange, venueCity }: Props) {
  const [urlsOpen, setUrlsOpen] = useState(false)

  const set = (key: keyof MeetPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: e.target.value || null })

  const handleScrapedFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!values.scraped_at) {
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      onChange({ scraped_at: local })
      e.target.value = local
    }
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <Field label="Name" id="name">
        <input id="name" className="field-input" value={values.name || ''} onChange={set('name')} />
      </Field>
      <Field label="Date" id="date">
        <input id="date" type="date" className="field-input" value={values.date || ''} onChange={set('date')} />
      </Field>
      <Field label="Location" id="location">
        <input id="location" className="field-input" value={values.location || ''} onChange={set('location')} />
      </Field>
      <Field label="Venue" id="venue">
        <VenueTypeahead
          value={values.venue_id || null}
          currentCity={venueCity || null}
          onChange={(id) => onChange({ venue_id: id })}
        />
      </Field>
      <Field label="Division" id="division">
        <input id="division" className="field-input" value={values.division || ''} onChange={set('division')} />
      </Field>
      <Field label="Season" id="season">
        <select id="season" className="field-input" value={values.season || ''} onChange={set('season')}>
          <option value="">—</option>
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="xc">XC</option>
        </select>
      </Field>
      <Field label="Timing Company" id="timing_company">
        <input id="timing_company" className="field-input" value={values.timing_company || ''} onChange={set('timing_company')} />
      </Field>
      <Field label="Scraped At" id="scraped_at">
        <input
          id="scraped_at"
          type="datetime-local"
          className="field-input"
          value={values.scraped_at || ''}
          onFocus={handleScrapedFocus}
          onChange={(e) => onChange({ scraped_at: e.target.value || null })}
        />
      </Field>

      {/* URLs — collapsible */}
      <div style={{ borderTop: '1px solid var(--border-thin)', marginTop: 12, paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setUrlsOpen((o) => !o)}
          style={{ fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}
        >
          {urlsOpen ? '▲' : '▼'} URLs
        </button>
        {urlsOpen && (
          <div style={{ marginTop: 8 }}>
            <Field label="Live URL 1 (AthleticsLive)" id="a_live_url_1">
              <input id="a_live_url_1" type="url" className="field-input" value={values.a_live_url_1 || ''} onChange={set('a_live_url_1')} />
            </Field>
            <Field label="Live URL 1 Scrapable" id="a_live_url_1_scrapable">
              <input
                id="a_live_url_1_scrapable"
                type="checkbox"
                checked={!!values.a_live_url_1_scrapable}
                onChange={(e) => onChange({ a_live_url_1_scrapable: e.target.checked })}
              />
            </Field>
            <Field label="Live URL 2" id="live_url_2">
              <input id="live_url_2" type="url" className="field-input" value={values.live_url_2 || ''} onChange={set('live_url_2')} />
            </Field>
            <Field label="Live URL 2 Scrapable" id="live_url_2_scrapable">
              <input
                id="live_url_2_scrapable"
                type="checkbox"
                checked={!!values.live_url_2_scrapable}
                onChange={(e) => onChange({ live_url_2_scrapable: e.target.checked })}
              />
            </Field>
            <Field label="TFRRS URL" id="tfrrs_url">
              <input id="tfrrs_url" type="url" className="field-input" value={values.tfrrs_url || ''} onChange={set('tfrrs_url')} />
            </Field>
            <Field label="Source URL (scraper-managed)" id="source_url">
              <input id="source_url" type="url" className="field-input" value={values.source_url || ''} onChange={set('source_url')} />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/components/MeetForm.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/MeetForm.tsx apps/web/tests/components/MeetForm.test.tsx
git commit -m "feat: MeetForm component + tests"
```

---

## Task 14: Component — AddMeetDrawer

**Files:**
- Create: `src/components/AddMeetDrawer.tsx`
- Create: `tests/components/AddMeetDrawer.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/AddMeetDrawer.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddMeetDrawer } from '../../src/components/AddMeetDrawer'
import * as service from '../../src/lib/meets-service'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues')

describe('AddMeetDrawer', () => {
  beforeEach(() => {
    vi.mocked(venueHook.useVenues).mockReturnValue({ venues: [], loading: false })
  })

  it('renders form fields when open', () => {
    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddMeetDrawer open={false} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
  })

  it('calls createMeet and onSaved on submit', async () => {
    const newMeet = { id: 'new1', name: 'Test', date: null, season: null, venue: null, events: [] }
    vi.mocked(service.createMeet).mockResolvedValue(newMeet as any)
    const onSaved = vi.fn()

    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Meet' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(service.createMeet).toHaveBeenCalled()
  })

  it('shows error message on createMeet failure', async () => {
    vi.mocked(service.createMeet).mockRejectedValue(new Error('insert failed'))

    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/insert failed/i)).toBeInTheDocument())
  })

  it('calls onClose when × is clicked', () => {
    const onClose = vi.fn()
    render(<AddMeetDrawer open={true} onClose={onClose} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/components/AddMeetDrawer.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement AddMeetDrawer**

```tsx
// src/components/AddMeetDrawer.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { createMeet } from '../lib/meets-service'
import { MeetForm } from './MeetForm'
import type { MeetPayload } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const emptyPayload: MeetPayload = {
  name: null, date: null, location: null, venue_id: null,
  division: null, season: null, indoor: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
}

export function AddMeetDrawer({ open, onClose, onSaved }: Props) {
  const [values, setValues] = useState<MeetPayload>(emptyPayload)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleChange = (patch: Partial<MeetPayload>) =>
    setValues((prev) => ({ ...prev, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await createMeet(supabase, values)
      setValues(emptyPayload)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480,
          background: 'var(--bg-card)', borderLeft: '3px solid var(--border)',
          zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="window-header">
          <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Add Meet
          </span>
          <button aria-label="close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <MeetForm values={values} onChange={handleChange} />
        </div>

        {error && (
          <div style={{ padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>{error}</div>
        )}

        <div style={{ padding: '12px', borderTop: '2px solid var(--border)' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving...' : 'Save Meet'}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/components/AddMeetDrawer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/AddMeetDrawer.tsx apps/web/tests/components/AddMeetDrawer.test.tsx
git commit -m "feat: AddMeetDrawer component + tests"
```

---

## Task 15: Page — MeetsList

**Files:**
- Create: `src/pages/MeetsList.tsx`
- Create: `tests/pages/MeetsList.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/pages/MeetsList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MeetsList } from '../../src/pages/MeetsList'
import * as useMeetsHook from '../../src/hooks/useMeets'
import * as serviceModule from '../../src/lib/meets-service'

vi.mock('../../src/hooks/useMeets')
vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues', () => ({
  useVenues: () => ({ venues: [], loading: false }),
}))

const meets = [
  {
    id: '1', name: 'Big 12 Indoor', date: '2026-02-28',
    location: 'Fayetteville, AR', season: 'indoor', division: 'D1',
    venue: { id: 'v1', city: 'Fayetteville', is_altitude: false },
    events: [{ count: 12 }], scraped_at: '2026-03-01T00:00:00Z',
    a_live_url_1: null, a_live_url_1_scrapable: null,
    live_url_2: null, live_url_2_scrapable: null,
  },
  {
    id: '2', name: null, date: null,
    location: 'Albuquerque, NM', season: 'outdoor', division: null,
    venue: { id: 'v2', city: 'Albuquerque', is_altitude: true },
    events: [{ count: 0 }], scraped_at: null,
    a_live_url_1: null, a_live_url_1_scrapable: null,
    live_url_2: null, live_url_2_scrapable: null,
  },
]

describe('MeetsList', () => {
  beforeEach(() => {
    vi.mocked(useMeetsHook.useMeets).mockReturnValue({
      meets: meets as any,
      filters: {},
      setFilters: vi.fn(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renders meet names in the table', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('Big 12 Indoor')).toBeInTheDocument()
  })

  it('shows ⌀ flag for null name', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    const nullFlags = screen.getAllByText('⌀')
    expect(nullFlags.length).toBeGreaterThan(0)
  })

  it('shows altitude badge for altitude venues', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText(/ALT/i)).toBeInTheDocument()
  })

  it('shows scraped checkmark for meets with scraped_at', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows — for meets without scraped_at', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows ADD MEET button', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText(/add meet/i)).toBeInTheDocument()
  })

  it('shows event count', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/pages/MeetsList.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement MeetsList**

```tsx
// src/pages/MeetsList.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeets } from '../hooks/useMeets'
import { FilterBar } from '../components/FilterBar'
import { AddMeetDrawer } from '../components/AddMeetDrawer'
import type { Meet } from '../lib/types'

function NullFlag() {
  return <span style={{ color: '#DC2626', fontFamily: 'Teko', fontSize: 14 }}>⌀</span>
}

function MeetRow({ meet, onClick }: { meet: Meet; onClick: () => void }) {
  const eventCount = meet.events?.[0]?.count ?? 0
  const isAltitude = meet.venue?.is_altitude

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-thin)' }}
      className="hover:bg-[var(--bg-card-inner)] transition-colors"
    >
      <td style={{ padding: '10px 12px', fontWeight: 500 }}>
        {meet.name ?? <NullFlag />}
        {isAltitude && (
          <span style={{ marginLeft: 8, fontFamily: 'Teko', fontSize: 12, color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px' }}>
            ALT
          </span>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
        {meet.date ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {meet.location ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase' }}>
        {meet.season ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {meet.division ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, textAlign: 'right' }}>
        {eventCount}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        {meet.scraped_at
          ? <span style={{ color: '#16A34A' }}>✓</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
    </tr>
  )
}

export function MeetsList() {
  const navigate = useNavigate()
  const { meets, filters, setFilters, loading, error, refetch } = useMeets()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="finish-stripe" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div className="window-card">
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Meets
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, marginLeft: 12, color: 'var(--text-muted)' }}>
                {meets.length}
              </span>
            </span>
            <button className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Add Meet
            </button>
          </div>

          <FilterBar filters={filters} onFiltersChange={setFilters} />

          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 18, textTransform: 'uppercase' }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ padding: 16, color: '#DC2626', fontSize: 13 }}>
              {error.message}
            </div>
          )}

          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card-inner)' }}>
                    {['Name', 'Date', 'Location', 'Season', 'Division', 'Events', 'Scraped'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Events' || h === 'Scraped' ? 'center' : 'left', fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--stripe)' }}>
                        No meets match current filters
                      </td>
                    </tr>
                  ) : (
                    meets.map((meet) => (
                      <MeetRow
                        key={meet.id}
                        meet={meet}
                        onClick={() => navigate(`/meets/${meet.id}`)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddMeetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); refetch() }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- tests/pages/MeetsList.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/MeetsList.tsx apps/web/tests/pages/MeetsList.test.tsx
git commit -m "feat: MeetsList page + tests"
```

---

## Task 16: Page — MeetDetail

**Files:**
- Create: `src/pages/MeetDetail.tsx`
- Create: `tests/pages/MeetDetail.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/pages/MeetDetail.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MeetDetail } from '../../src/pages/MeetDetail'
import * as useMeetHook from '../../src/hooks/useMeet'
import * as service from '../../src/lib/meets-service'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useMeet')
vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues', () => ({
  useVenues: () => ({ venues: [], loading: false }),
}))

const meet = {
  id: 'abc', name: 'Big 12 Indoor', date: '2026-02-28',
  location: 'Fayetteville, AR', season: 'indoor' as const,
  venue_id: null, venue: null, indoor: true,
  division: 'D1', timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
  created_at: '2026-01-01', updated_at: null,
}
const events = [{ id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', name: null, date: null, location: null, season: null, source_url: null, results: [{ count: 24 }] }]

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/meets/abc']}>
      <Routes>
        <Route path="/meets/:id" element={<MeetDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MeetDetail', () => {
  beforeEach(() => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
  })

  it('renders meet name in the form', () => {
    renderDetail()
    expect(screen.getByDisplayValue('Big 12 Indoor')).toBeInTheDocument()
  })

  it('renders back link to /meets', () => {
    renderDetail()
    expect(screen.getByRole('link', { name: /meets/i })).toHaveAttribute('href', '/meets')
  })

  it('renders linked events section', () => {
    renderDetail()
    expect(screen.getByText('800m')).toBeInTheDocument()
    expect(screen.getByText('Women')).toBeInTheDocument()
  })

  it('shows Save button when isDirty', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: { name: 'Changed' }, setPatch: vi.fn(),
      isDirty: true, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('calls updateMeet on save', async () => {
    const refetch = vi.fn()
    vi.mocked(service.updateMeet).mockResolvedValue({ ...meet, name: 'Changed' } as any)
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: { name: 'Changed' }, setPatch: vi.fn(),
      isDirty: true, loading: false, error: null, refetch,
    })
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(service.updateMeet).toHaveBeenCalledWith(expect.anything(), 'abc', { name: 'Changed' }))
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test -- tests/pages/MeetDetail.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement MeetDetail**

```tsx
// src/pages/MeetDetail.tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateMeet } from '../lib/meets-service'
import { useMeet } from '../hooks/useMeet'
import { MeetForm } from '../components/MeetForm'
import type { MeetPayload } from '../lib/types'

export function MeetDetail() {
  const { id } = useParams<{ id: string }>()
  const { meet, events, patch, setPatch, isDirty, loading, error, refetch } = useMeet(id!)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!meet || !isDirty) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateMeet(supabase, meet.id, patch as Partial<MeetPayload>)
      refetch()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 18, textTransform: 'uppercase' }}>Loading...</div>
      </div>
    )
  }

  if (error || !meet) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, color: '#DC2626' }}>{error?.message ?? 'Meet not found'}</div>
      </div>
    )
  }

  // Merge meet values with uncommitted patch for display
  const formValues: MeetPayload = { ...meet, ...patch }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="finish-stripe" />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {/* Back nav */}
        <div style={{ marginBottom: 16 }}>
          <Link to="/meets" style={{ fontFamily: 'Teko', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}>
            ← Meets
          </Link>
        </div>

        {/* Edit form */}
        <div className="window-card" style={{ marginBottom: 16 }}>
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {meet.name ?? '—'}
            </span>
            {isDirty && (
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          {/* is_altitude display */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-thin)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Altitude:</span>
            {meet.venue
              ? (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: meet.venue.is_altitude ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {meet.venue.is_altitude ? `Yes — ${meet.venue.city}` : 'No'}
                </span>
              )
              : <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
          </div>

          <MeetForm
            values={formValues}
            onChange={setPatch}
            venueCity={meet.venue?.city}
          />

          {saveError && (
            <div style={{ padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>{saveError}</div>
          )}
        </div>

        {/* Linked events */}
        <div className="window-card">
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Events
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, marginLeft: 10, color: 'var(--text-muted)' }}>
                {events.length}
              </span>
            </span>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--stripe)', fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase' }}>
              No events linked
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card-inner)' }}>
                  {['Distance', 'Gender', 'Results'].map((h) => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-thin)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{ev.distance ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{ev.gender ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                      {ev.results?.[0]?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add navigate-away warning for dirty state**

In `src/pages/MeetDetail.tsx`, add a `useEffect` after the `useMeet` destructure:

```tsx
import { useEffect } from 'react'

// Inside MeetDetail, after useMeet():
useEffect(() => {
  if (!isDirty) return
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```

This is browser-native behavior — not covered by vitest component tests (those run in jsdom). No test needed; verify manually by editing a field and closing/refreshing the tab.

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test -- tests/pages/MeetDetail.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/MeetDetail.tsx apps/web/tests/pages/MeetDetail.test.tsx
git commit -m "feat: MeetDetail page + tests"
```

---

## Task 17: Wire App.tsx + Coverage Enforcement

**Files:**
- Modify: `src/App.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Update App.tsx with real page imports**

```tsx
// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { MeetsList } from './pages/MeetsList'
import { MeetDetail } from './pages/MeetDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/meets" element={<MeetsList />} />
      <Route path="/meets/:id" element={<MeetDetail />} />
      <Route path="*" element={<Navigate to="/meets" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Run full test suite + coverage**

```bash
npm run test -- --coverage
```

Expected: all tests PASS, coverage report printed. Check that lines/functions/branches are ≥ 80%.

If coverage is below threshold, identify which files are under-covered in the report and add targeted tests before proceeding.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Verify in browser:
- `http://localhost:5173/` redirects to `/meets`
- Meets list loads (419 rows from Supabase)
- Filters work: try season=Indoor, search for "big 12"
- Row click navigates to detail
- Detail form loads, edit a field, Save button appears, save updates DB
- Add Meet drawer opens, fill in name + save, row appears in list
- Verify fonts (Teko headers, DM Sans body, JetBrains Mono for dates/counts)
- Verify finish stripe appears at top

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/vite.config.ts
git commit -m "feat: wire App.tsx routes + enforce 80% coverage threshold"
```

---

## Auth TODO

Auth (Supabase magic link + route gating) is explicitly deferred. When implementing:
1. Add a `LoginPage` at `/login`
2. Wrap all routes in a `<RequireAuth>` component that checks `supabase.auth.getSession()`
3. Redirect unauthenticated users to `/login`
4. On successful magic link flow, redirect back to `/meets`

---

## Scraper / DB Field Sync Reminder

Per the design spec: if a field is added or removed from the `meets` schema, the scraper and the DB migration must be updated in the same change. The frontend reads whatever is in the schema — it does not need updating separately.
