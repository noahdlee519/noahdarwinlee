# CHRONIA profiles and comments: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task, test first.

**Goal:** signed-in readers get a username and a picture, and can comment on a country's card; the team can moderate.

**Architecture:** one new edge function, `chronia-comments`, behind which sit three closed tables and a public storage bucket; the page talks only to the function, as it does for reports. The card's section and the profile form live in a new lazily loaded file, `chronia/comments.js`, handed what it needs by `app.js`, as `dev.js` is.

**Tech stack:** Deno (edge function, `deno test`), PostgreSQL 16 (tested locally with `/usr/lib/postgresql/16`), plain JavaScript on the page, Playwright checks with a stand-in server.

**Spec:** `docs/superpowers/specs/2026-11-24-chronia-comments-design.md`

## Global constraints

- The page never reads or writes the tables or the bucket; every table has row-level security on and no grants to `anon` or `authenticated`.
- User text reaches the page only through `textContent`.
- Limits: 100 comments a day (UTC) and one every 10 seconds; 500 characters; 20 reports a day; 5 picture changes a day; a name change every 30 days; hidden at 3 reports.
- Usernames: `^[A-Za-z][A-Za-z0-9_]{2,19}$`, unique by lowercase key.
- A profile is made only with `age: true` in the request.
- Interface text: Oxford comma; `|` as the separator; the page's voice.
- If the function can't be reached, the card shows no Comments section.

## Review focus

1. A store or a list emptied or reordered between a request and its answer (the reader opens another card before the first thread arrives): the answer for the old card must be dropped.
2. A comment, username, or country name containing HTML or quotes: shown as text, sent as JSON, never built into a query string unescaped.
3. Two posts sent at once at the cap, or within the 10 seconds: only one lands (the database function decides, under a lock).
4. A blocked account, or one without a profile, posting or reporting through the function directly: refused.
5. A picture that is not an image, too large, or refused by the check: nothing stored, the old picture kept.

## Tasks

### Task 1: the rules (pure module)

**Files:** create `supabase/functions/chronia-comments/rules.ts`, `lists.ts` (generated), `rules.test.ts`; create `tools/build-comment-lists.mjs`, `tools/vendor/comment-lists/` (LDNOOBW's files for the site's languages, The Big Username Blocklist's `list.txt`, their licences).

**Produces:**
- `checkUsername(name: string): { ok: true, key: string } | { ok: false, why: "shape" | "reserved" | "word" }`
- `checkComment(text: string): { ok: true, text: string } | { ok: false, why: "empty" | "long" | "link" | "word" }`
- `atNumber(at: string): number | null` (a map date `-?YYYY[-MM[-DD]]` as a fractional year)
- `imageKind(bytes: Uint8Array): "webp" | "jpeg" | "png" | null`

**Tests (write first):** names that must pass (`Essex_Man`, `Titus`, `Scunthorpe`, `Assassin9`, `Cumberland`, `noahs_ark`? no: see reserved) and fail (`admin`, `Adm1n`, `chronia_team`, `Moderator`, `ab`, `9lives`, a profanity plain, with look-alike digits, and inside a longer name); comments that must pass ("The Rape of Nanjing", "Nazi Germany", "slave trade", "Essex") and fail (a slur, an explicit obscenity, "see http://x.co", "www.example.com", empty, 501 characters); `atNumber("1789-07-14")` between 1789.5 and 1789.6, `atNumber("-0500")` = -500, bad text = null; image kinds by magic bytes.

### Task 2: the database

**Files:** create `supabase/migrations/202611240700_chronia_comments.sql`, `supabase/tests/chronia_comments.sql`, `tools/db-test.sh` (starts a throwaway local cluster, makes the roles and the `auth.users` and `storage.buckets` stand-ins, runs the migration twice and then the tests).

**Produces (called by the function with the secret key):**
- tables `chronia_profiles`, `chronia_comments`, `chronia_flags`; bucket `chronia-avatars` (public).
- `chronia_profile_save(p_user uuid, p_username text, p_key text, p_avatar text, p_age boolean, p_name_days int) returns jsonb` (`{ok}` or `{error: "taken" | "age" | "soon" | "blocked"}`)
- `chronia_comment_send(p_user uuid, p_polity text, p_at text, p_at_num numeric, p_body text, p_cap int, p_gap_s int) returns jsonb` (`{id, sent}` or `{error: "limit" | "fast" | "profile" | "blocked"}`)
- `chronia_flag_add(p_user uuid, p_comment bigint, p_target uuid, p_cap int, p_hide int) returns jsonb` (`{ok, flags, hidden}` or `{error}`)
- `chronia_account_erase(p_user uuid) returns void`

**Tests:** safe to run twice; a second profile with the same key in another case is "taken"; no profile without age; the 101st comment of a day is "limit" and a second within 10 s is "fast"; three flags from three accounts hide a comment, a fourth account's flag changes nothing more, and one account flagging twice counts once; erase removes profile, comments, and flags; `anon` and `authenticated` can select from none of the tables.

### Task 3: the function

**Files:** create `supabase/functions/chronia-comments/index.ts`, `index.test.ts` (a stand-in `fetch` for the database, auth, storage, and the model).

**Actions (POST JSON, origin-checked as `chronia-report`):**
- open to all: `list { names: string[] (1 to 60), sort: "new" | "near", at?: string, offset?: number }` → `{ comments: [{ id, username, avatar, polity, at, text, mine?, flagged? }], more, role? }`
- signed in: `me` → `{ profile | null, left, role }`; `name { username }` → `{ ok, why? }`; `profile { username?, age?, avatar?: base64 | "" }` → `{ profile }`; `post { name, at, text }` → `{ comment, left }`; `delete { id }`; `flag { id }` or `flag { user }`
- team: `queue` → `{ comments, pictures, orphans? }`; reviewer: `restore { id }`, `remove { id }`, `block { user, on }`, `picture { user, on }`, `move { from, to }`, `erase { user }`

**Tests:** `list` needs no sign-in and never returns hidden or removed comments or a blocked user's; `post` without a profile is 403 `profile`; a refused word is 400 `word` and nothing is stored; `profile` without `age` is 400; an avatar the model refuses is 400 `picture` and nothing is uploaded; the model unreachable is 503; `queue` is 403 off the team; `restore` is 403 for a viewer.

### Task 4: the card and the profile (page)

**Files:** create `chronia/comments.js`; modify `chronia/index.html` (the card's section, the Account panel's profile), `chronia/app.js` (hand-over object `window.CHRONIA_COMMENTS`, load on a card's first opening, thread names from the tags), `chronia/app.css`; create `tools/chronia-comments-check.mjs`.

**Tests (stand-in server by route):** the section follows Sources with a rule and "Comments"; a tagged country's heading names the tag and its request carries the tag's names; comments show picture or initial, username, and date, and a date press moves the map; "Newest | Nearest to …" asks again with the sort; signed out, the composer offers sign-in; signed in without a profile, the form needs a valid name and the age box; a post is sent with the card's name and the map's date and appears first; Report and Delete call the function; a comment of `<img src=x onerror=...>` is text; a failing function leaves no section; an answer for a card since closed is dropped.

### Task 5: the team's dashboard

**Files:** modify `chronia/reports/index.html`, `reports.js`, `reports.css` (and its image policy for the bucket); extend `tools/chronia-comments-check.mjs`.

**Tests:** a team member sees the comments list with counts; a reviewer's Restore, Remove, Block, and Move call the function and update the row; a viewer has no buttons.

### Task 6: the words

**Files:** modify `chronia/privacy/index.html`, `chronia/terms/index.html`, `chronia/moreinfo/` (LDNOOBW's credit), `chronia/README.md`; update the project's privacy doc.

### Task 7: going live

Apply the migration and the bucket to the live project, deploy `chronia-comments`, check the function's logs and the advisors, push the page.

### Task 8: translations

The new interface strings into the site's 13 other languages (`chronia/lang/*.js`), by an agent, after the English is settled.
