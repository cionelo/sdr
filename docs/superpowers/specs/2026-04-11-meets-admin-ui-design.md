# Meets Admin UI — Design Spec
**Date:** 2026-04-11
**URL:** itsnemo.dev/pace/meets
**Scope:** Full CRUD admin dashboard for manual data maintenance of the `meets` table. This scaffold is the foundation for all future SDR frontend pages (athlete profiles, composite scores, etc.).

---

## Context

The `meets` table is live in Supabase (migration 007+008, 419 meets, 493 events linked). This UI is a single-user admin tool for:
- Viewing and searching meets
- Editing meet metadata, URLs, and scraper status
- Adding new meets
- Doing visual QA on ingestion state

Auth (Supabase magic link) is deferred — added as a TODO.

---

## Stack

| | |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + CSS custom properties from concept-c-poster |
| Routing | react-router-dom v6 (BrowserRouter) |
| Testing | vitest + @testing-library/react + @testing-library/user-event + jsdom |
| Data | Supabase JS v2 (existing client) |

**No additional UI frameworks.** react-router-dom is a routing utility, not a UI framework.

---

## Routes

```
/meets         → MeetsList page
/meets/:id     → MeetDetail page
```

Add Meet is a drawer overlay on MeetsList — no separate route.

---

## File Structure

```
src/
  lib/
    supabase.ts             # client init (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    meets-service.ts        # fetchMeets, fetchMeet, createMeet, updateMeet, fetchVenues
    types.ts                # Meet, MeetFilters, MeetPayload, Venue, MeetEvent
  hooks/
    useMeets.ts             # list + filters, filter state in URL search params
    useMeet.ts              # single meet + linked events, dirty state
    useVenues.ts            # venue typeahead (city ilike, limit 10)
  pages/
    MeetsList.tsx           # /meets
    MeetDetail.tsx          # /meets/:id
  components/
    MeetForm.tsx            # shared form fields (used by MeetDetail + AddMeetDrawer)
    AddMeetDrawer.tsx       # slide-in overlay on MeetsList
    FilterBar.tsx           # full filter row (search + pills + date range)
    VenueTypeahead.tsx      # venue search → sdr_venues
  App.tsx                   # BrowserRouter + routes
  main.tsx
  index.css                 # design tokens (CSS custom properties)

tests/
  lib/
    meets-service.test.ts
  hooks/
    useMeets.test.ts
    useMeet.test.ts
    useVenues.test.ts
  pages/
    MeetsList.test.tsx
    MeetDetail.test.tsx
  components/
    AddMeetDrawer.test.tsx
    MeetForm.test.tsx
    FilterBar.test.tsx
```

---

## Data Layer

### meets-service.ts

All functions accept a Supabase client instance (injected — enables unit testing without global mocks).

```ts
fetchMeets(client, filters: MeetFilters): Promise<Meet[]>
fetchMeet(client, id: string): Promise<{ meet: Meet; events: MeetEvent[] }>
createMeet(client, payload: MeetPayload): Promise<Meet>
updateMeet(client, id: string, patch: Partial<MeetPayload>): Promise<Meet>
fetchVenues(client, query: string): Promise<Venue[]>
```

`fetchMeets` uses `select('*, events(count)')` — event count in a single query. Filters applied server-side via Supabase query builder.

### MeetFilters shape

```ts
interface MeetFilters {
  search?: string        // ilike on name + location
  season?: 'indoor' | 'outdoor' | 'xc'
  dateFrom?: string      // ISO date
  dateTo?: string        // ISO date
  isAltitude?: boolean   // derived from venue.is_altitude
  hasScrapableUrl?: boolean  // OR: a_live_url_1_scrapable OR live_url_2_scrapable
  hasScraped?: boolean   // scraped_at IS NOT NULL
}
```

### Hooks

```ts
useMeets(filters)  → { meets: Meet[], loading: boolean, error: Error | null, refetch: () => void }
useMeet(id)        → { meet: Meet | null, events: MeetEvent[], loading: boolean, error: Error | null, refetch: () => void }
useVenues(query)   → { venues: Venue[], loading: boolean }
```

Filter state in `useMeets` is persisted to URL search params (`useSearchParams`) — survives refresh.

---

## Views

### Meets List (`/meets`)

**Layout:** Full-page. Finish stripe at top. Window-card containing table.

**Window header:** `MEETS` (Teko) · total count (JetBrains Mono) · `+ ADD MEET` button (btn-primary)

**Filter bar (above table):**
1. Full-width search input (debounced 300ms, server-side `ilike` on name + location)
2. Pill row: Season (All / Indoor / Outdoor / XC) · Altitude (All / Yes / No) · Scrapable (All / Yes / No) · Scraped (All / Yes / No)
3. Date range: From + To date inputs (DM Sans)

**Table columns:** Name · Date · Location · Season · Division · Events (count)

**Visual flags (inline):**
- Null name/date/location: `⌀` in red (`#DC2626`)
- is_altitude row: blue altitude badge (accent border)
- scraped_at present: muted green `✓` / absent: `—`

**Mobile (< 768px):** Table becomes stacked cards. Filter pills wrap. Search stays full-width. Date range stacks vertically.

**Row click:** `navigate('/meets/:id')`

---

### Meet Detail (`/meets/:id`)

**Layout:** Back link → `/meets`. Two sections in a window-card.

**Section 1 — Edit form (all editable):**

| Field | Input type | Notes |
|---|---|---|
| name | text | |
| date | date | |
| location | text | |
| venue | VenueTypeahead | city search → sdr_venues; shows is_altitude below if venue linked |
| division | text | |
| season | select | indoor / outdoor / xc |
| timing_company | text | |
| is_altitude | read-only display | derived from venue; shows `—` if no venue |
| **URLs (collapsible section)** | | |
| a_live_url_1 | url input | + scrapable toggle (checkbox/pill) |
| live_url_2 | url input | + scrapable toggle |
| tfrrs_url | url input | |
| source_url | url input | note: scraper also writes this — manual edits may be overwritten on next ingest |
| scraped_at | datetime-local | pre-fills `now()` when focused if empty; clear = null (manual boolean via timestamp presence) |

**Save button:** calls `updateMeet()`. Dirty state tracked — browser `beforeunload` warning if unsaved changes.

**Section 2 — Linked events (read-only):**
Distance · Gender · Result count (JetBrains Mono). Empty state if no events.

---

### Add Meet Drawer

Slides in from right over MeetsList. Same `MeetForm` component as detail.

- All editable fields from Meet Detail (minus is_altitude display and linked events)
- Save → `createMeet()` → close drawer → refetch list
- Close (×) with unsaved data → confirm prompt

---

## Design Language

Directly from `pace/docs/design-concepts/concept-c-poster.html`. No new patterns invented.

### Fonts
```css
font-family: 'Teko', sans-serif;        /* headers, labels, buttons, pills */
font-family: 'DM Sans', sans-serif;     /* body, form inputs, descriptions */
font-family: 'JetBrains Mono', mono;    /* dates, counts, timestamps, URLs */
```

### CSS Custom Properties (in index.css)
```css
--bg: #FFFBEB;
--bg-card: #FFFFFF;
--bg-card-inner: #FEF9E7;
--border: #1C1917;
--border-thin: #D6D3D1;
--border-accent: #1E3A8A;
--text: #1C1917;
--text-secondary: #57534E;
--text-muted: #A8A29E;
--accent: #1E3A8A;
--accent-light: #EFF6FF;
--accent-hover: #1E40AF;
--control-bg: #F5F5F4;
--control-active: #1C1917;
--control-active-text: #FFFBEB;
/* Dark mode tokens carried over for future use */
```

### Reused Patterns
- `window-card` — 3px solid `--border`, window-header with Teko title
- `pill-group` — 2px border container, active pill = filled `--control-active`
- `search-input` — 3px bottom border only, focus → `--accent`
- `finish-stripe` — 6px dashed accent bar at page top
- `btn-primary` — Teko, uppercase, accent fill, 2px border
- `icon-btn` — 36px square, 2px border
- Empty/loading states — diagonal `--stripe` pattern
- `finish-stripe` at top of every page

---

## Testing Strategy

### Stack
```
vitest + @testing-library/react + @testing-library/user-event + jsdom
Coverage threshold: 80% (enforced in vite.config.ts)
```

### TDD Order (per feature)
1. Service test → RED → implement service → GREEN
2. Hook test → RED → implement hook → GREEN
3. Component test → RED → implement component → GREEN

### Coverage Plan

| File | What's tested |
|---|---|
| `meets-service.ts` | All CRUD functions, every filter combination, error paths, null venue edge case |
| `useMeets` | Filter changes trigger refetch, URL param persistence, loading/error states |
| `useMeet` | Load meet + events, dirty state tracking |
| `useVenues` | Debounce, empty query returns empty, loading state |
| `MeetForm` | All fields render, validation, scraped_at pre-fill on focus, dirty tracking |
| `FilterBar` | Pill active state, search debounce, date range inputs |
| `MeetsList` | Row rendering, visual flags (altitude badge, null indicator, scraped check) |
| `MeetDetail` | Load → edit → save flow, navigate-away warning, read-only events section |
| `AddMeetDrawer` | Open/close, submit calls createMeet, success closes + refetches |

Service tests: inject mock Supabase client.
Hook tests: `renderHook` with mocked service module.
Component tests: mock hooks at module level.

---

## Deferred / Out of Scope

| Item | Status |
|---|---|
| Auth (Supabase magic link, route gating) | TODO — next session |
| Results/splits editing | Out of scope v1 |
| Public views | Out of scope v1 |
| SDR score display | Out of scope v1 |
| source_url migration | Not needed — already in meets table (migration 007) |

---

## Schema Reference (live)

`meets`: id, name, date, location, venue_id → sdr_venues(id, city, is_altitude), division, season, indoor, timing_company, a_live_url_1, a_live_url_1_scrapable, live_url_2, live_url_2_scrapable, tfrrs_url, source_url, scraped_at, created_at, updated_at

`events`: meet_id FK, name, date, location, gender, distance, season, source_url
