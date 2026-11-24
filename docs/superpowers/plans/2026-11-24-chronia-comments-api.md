# `chronia-comments`: the contract between the page and the function

Shared by the tasks that build the function (Task 3), the card (Task 4), and the team's dashboard (Task 5) in `2026-11-24-chronia-comments.md`. If a task finds the contract wrong, it says so in its report; it does not quietly diverge.

## Transport

- URL: `https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-comments`
- `POST`, `Content-Type: application/json`, body `{ "action": "...", ... }`, at most 400,000 characters (a picture is the only large field).
- Signed in: `Authorization: Bearer <access token>`, the same Supabase session the page keeps for reports (`reportSession.a`, refreshed through `chronia-report`'s `refresh` action as now).
- Origins allowed: `https://chroniaatlas.com`, `https://www.chroniaatlas.com`, and `http://localhost:*` / `http://127.0.0.1:*`. Others get 403.
- Every answer is JSON. Errors are `{ "error": "<code>" }` with these statuses: 400 (`body`, `action`, `field` with `"field": "<name>"`, `word`, `link`, `long`, `empty`, `shape`, `reserved`, `picture`, `age`), 401 (`signin`), 403 (`profile` = no profile yet, `blocked`, `team`, `review`, `own`), 404 (`missing`), 409 (`taken`, `soon` with `"days": n` left), 413 (`long`), 429 (`limit` with `"cap": n`, `fast` with `"wait": seconds`), 500 (`store`, `auth`), 503 (`check` = the picture check can't be reached).

## Shapes

```
Profile   { "username": "Herodotus", "avatar": "https://…/chronia-avatars/ab12….webp" | null, "blocked": false }
Comment   { "id": 123, "username": "Herodotus", "avatar": "https://…" | null, "polity": "Kingdom of France",
            "at": "1789-07-14", "text": "…", "mine": true | false }
```

- `at` is the map's date as the page writes it elsewhere: `-?\d{1,4}` (a year), `…-MM`, or `…-MM-DD`.
- `avatar` is a full public URL, or null (the page then draws the username's initial).
- `mine` is true only for the signed-in caller's own comments; absent or false otherwise.
- For a caller on the team, a Comment also has `"flags": n`, `"state": "live" | "hidden" | "removed"`, and `"user": "<account id>"`.

## Actions open to everyone

- `list { names: string[1..60], sort?: "new" | "near", at?: string, offset?: number }` → `{ comments: Comment[], more: boolean, total: number }`
  - Only live comments by accounts that are not blocked. Twenty at a time; `offset` is how many to skip.
  - `sort: "near"` needs `at` and orders by distance in time from it, then newest.
  - With a signed-in caller's token, `mine` is set, and for a team member the team's fields.

## Actions for a signed-in account

- `me` → `{ profile: Profile | null, left: number, cap: 100, role: "viewer" | "reviewer" | null }`
- `name { username }` → `{ ok: true }` or `{ ok: false, why: "shape" | "reserved" | "word" | "taken" }` (status 200 either way)
- `profile { username?: string, age?: true, avatar?: string }` → `{ profile: Profile }`
  - The first call must carry `username` and `age: true`. Later calls may change either field.
  - `avatar` is base64 of a WebP, JPEG, or PNG of at most 200 KB (no `data:` prefix), or `""` to remove the picture.
- `post { name: string, at: string, text: string }` → `{ comment: Comment, left: number }`
- `delete { id }` → `{ ok: true }` (one's own; a reviewer may delete any, which marks it removed)
- `flag { id }` or `flag { user: "<username>" }` (a picture) → `{ ok: true }` (flagging the same thing twice is still `ok`)

## Actions for the team (`viewer` or `reviewer` in `chronia_team`)

- `queue` → `{ role, comments: Comment[] (every comment with flags > 0 or not live, newest first, at most 500), pictures: [{ "username", "avatar", "user", "flags", "state": "ok" | "hidden" | "removed" }], names: string[] (every distinct `polity` stored, for the page to find those no longer on the map) }`
- Reviewer only (a viewer gets 403 `review`):
  - `restore { id }` → `{ comment }` (live again, flags cleared)
  - `remove { id }` → `{ comment }`
  - `block { user: "<account id>", on: boolean }` → `{ ok: true }`
  - `picture { user: "<account id>", on: boolean }` → `{ ok: true }` (off removes the picture; on restores a hidden one)
  - `move { from: string, to: string }` → `{ moved: n }` (every comment stored under `from` now under `to`)
  - `erase { user: "<account id>" }` → `{ ok: true }` (profile, picture file, comments, and flags gone)
