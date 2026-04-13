#SDR: Meet Database UI Requirements + Supabase Migrations


Build a private admin UI for the PACE track meet database. Dashboard for me to visually keep up with

Project: sdr/apps/web/ (Vite + React + Tailwind, scaffolded) <- in /pace or /sdr? optimum suggestion for repo organization?
Supabase: zlvtnrtkqfhkjimbpkmp
URL: itsnemo.dev/pace/meets

---

## Phase 0: Migration

No meets table exists. Events are race sections — name includes gender/distance/section suffix.
Current events schema: id, source_id, name, date, location, gender, distance, season, provider, source_url, division, conference_id

Create meets + link events:

CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE,
  location TEXT,
  venue_id TEXT REFERENCES sdr_venues(id),
  division TEXT,
  season TEXT,
  indoor BOOLEAN DEFAULT false,
  source_url TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ADD COLUMN meet_id UUID REFERENCES meets(id);

Backfill: group events by (source_url, date) → one meet per unique pair.
Derive canonical name by stripping gender + distance + "Section N" suffix.
Apply via apply_migration.

---

## Auth

Supabase magic link. Single user. Gate all routes behind session check.

---

## Views

**Meets List (default)**
Table: name, date, location, indoor, division, season, source_url (can have two, athleticlive one and other independent timing company one), event count
Flag nulls visually. Filter: season, indoor, division, has_source_url. 

**Meet Detail**
Edit: name, date, location, venue (typeahead → sdr_venues), indoor, division, season, source_url (again there can be two fields for this), 
-also want is_at_altitude chkbox, has been scrapped chkbox, source_url verified chkbox (may need supabase fields for these flags too),

Read-only: linked events list (distance, gender, result count)

**Add Meet (drawer)**
Same fields as edit. On save: insert into meets.

---

## Design

Match: ~/PACE/pace/docs/design-concepts/concept-c-poster.html
Invoke at session start: /superpowers-brainstorm → /frontend-design + /ui-ux-pro-max
Stack: Vite + React + Tailwind only. TDD, 80%+ coverage.

## Out of Scope
Results/splits editing, public views, Claude enrichment, SDR scores.

p.s: do we have a flag for meets that have already sucessfully scraped for results/splits (does this need to be a migration implemented in supabase too?). i also want frontend viewing/updates on this as well.
