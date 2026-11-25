# `chronia-comments`: the contract between the page and the function

Shared by the tasks that build the function (Task 3), the card (Task 4), and the team's dashboard (Task 5) in `2026-11-24-chronia-comments.md`. If a task finds the contract wrong, it says so in its report; it does not quietly diverge.

Replies, upvotes, and the account's own comments were added on 25 November 2026 (`docs/superpowers/specs/2026-11-25-chronia-replies-votes-design.md`, migration `202611250600_chronia_replies_votes.sql`): the `thread`, `vote`, and `mine` actions, `parent` on `post`, `sort: "top"`, and the Comment's new fields. A page may meet a function from before them: it reads a missing `votes` or `replies` as absent, and on 400 `action` to `thread`, `vote`, or `mine` stops offering them.

## Transport

- URL: `https://jvcmeuqlyygpwelmvxuv.supabase.co/functions/v1/chronia-comments`
- `POST`, `Content-Type: application/json`, body `{ "action": "...", ... }`, at most 400,000 characters (a picture is the only large field).
- Signed in: `Authorization: Bearer <access token>`, the same Supabase session the page keeps for reports (`reportSession.a`, refreshed through `chronia-report`'s `refresh` action as now).
- Origins allowed: `https://chroniaatlas.com`, `https://www.chroniaatlas.com`, and `http://localhost:*` / `http://127.0.0.1:*`. Others get 403.
- Every answer is JSON. Errors are `{ "error": "<code>" }` with these statuses: 400 (`body`, `action`, `field` with `"field": "<name>"`, `word`, `link`, `long`, `empty`, `shape`, `reserved`, `picture`, `age`), 401 (`signin`), 403 (`profile` = no profile yet, `blocked`, `team`, `review`, `own`), 404 (`missing`, `gone` = the comment replied to, voted on, or whose thread is asked for is not there or not shown), 409 (`taken`, `soon` with `"days": n` left), 413 (`long`), 429 (`limit` with `"cap": n`, for comments, reports, pictures, or upvotes; `fast` with `"wait": seconds`), 500 (`store`, `auth`), 503 (`check` = the picture check can't be reached).

## Shapes

```
Profile   { "username": "Herodotus", "avatar": "https://…/chronia-avatars/ab12….webp" | null, "blocked": false }
Comment   { "id": 123, "username": "Herodotus", "avatar": "https://…" | null, "polity": "Kingdom of France",
            "at": "1789-07-14", "text": "…", "mine": true | false,
            "parent": 456 | null, "root": 123 | null, "depth": 0..8, "votes": 3, "voted": true | false,
            "replying_to": "username" | null,
            "replies": 5,                       (top comments in `list` only)
            "deleted": true, "hidden": true }   (only for a placeholder; hidden only if it was hidden, not deleted)
```

- `at` is the map's date as the page writes it elsewhere: `-?\d{1,4}` (a year), `…-MM`, or `…-MM-DD`.
- `avatar` is a full public URL, or null (the page then draws the username's initial).
- `mine` is true only for the signed-in caller's own comments; absent or false otherwise.
- For a caller on the team, a Comment also has `"flags": n`, `"state": "live" | "hidden" | "removed"`, and `"user": "<account id>"`.
- `parent` is the comment a reply sits under and `root` its thread's top comment, both null for a top comment; `depth` is 0 for a top comment and its parent's + 1 for a reply, at most 8. A reply to a comment at depth 8 is stored beside it (under its parent, at depth 8); its `replying_to` is then the username of the comment it answers. In `list` and `thread`, `replying_to` is set only for such a reply; in `mine`, for every reply (null where the comment answered is not shown).
- `votes` is the comment's count of upvotes, and `voted` whether the caller gave one (false signed out).
- A placeholder stands in a thread for a comment that is not shown but has replies shown under it: deleted by its writer or with its account erased (`deleted`), or hidden, removed, or by a blocked account (`deleted` and `hidden`). It has `username` and `avatar` null, `text` "", and `votes` 0, and is never `mine`; it can't be replied to or voted on.

## Actions open to everyone

- `list { names: string[1..60], sort?: "new" | "near" | "top", at?: string, offset?: number }` → `{ comments: Comment[], more: boolean, total: number }`
  - Top comments only (`parent` null): live ones by accounts that are not blocked, and placeholders for the others while live replies are under them. Each has `replies`, the count of live replies under it at any depth. Twenty at a time; `offset` is how many to skip.
  - `sort: "near"` needs `at` and orders by distance in time from it, then newest; `sort: "top"` orders by `votes`, then newest.
  - With a signed-in caller's token, `mine` is set, and for a team member the team's fields.

- `thread { id }` → `{ comments: Comment[], more: boolean, root: number }`
  - The top comment of `id` (itself, if it is one) and every reply under it, in order of sending (so each parent comes before its replies, and replies under one parent are oldest first), with placeholders as above; at most 400 (`more` says there were more). 404 `gone` if the comment doesn't exist or nothing of its thread is shown. With a signed-in caller's token, `mine` and `voted` are set.

## Actions for a signed-in account

- `me` → `{ profile: Profile | null, left: number, cap: 100, role: "viewer" | "reviewer" | null }`
- `name { username }` → `{ ok: true }` or `{ ok: false, why: "shape" | "reserved" | "word" | "taken" }` (status 200 either way)
- `profile { username?: string, age?: true, avatar?: string }` → `{ profile: Profile }`
  - The first call must carry `username` and `age: true`. Later calls may change either field.
  - `avatar` is base64 of a WebP, JPEG, or PNG of at most 200 KB (no `data:` prefix), or `""` to remove the picture.
  - On the first call the profile is made before any picture is checked. If the picture then fails (refused, the check unreachable, the day's limit, or storage), the answer is still 200: `{ profile: Profile, picture_error: "picture" | "check" | "limit" | "store" }`, with the profile saved and no picture. On later calls a failing picture is an error as listed above.
  - Usernames are unique by a folded form, not only by case: look-alikes of a held name (`Her0dotus` beside `Herodotus`, `lliad` beside `Iliad`) are `taken`.
- `post { name: string, at: string, text: string, parent?: number }` → `{ comment: Comment, left: number }`
  - With `parent`, a reply: stored under its parent's thread at the depth above, with the caller's map date. 404 `gone` if the parent doesn't exist or is not shown; 400 `field` (`"field": "parent"`) if `name` is not the name its parent is stored under. Replies count toward the 100 a day and the 10 seconds between comments.
- `vote { id, on: boolean }` → `{ votes: number, voted: boolean }` (needs a profile)
  - `on: true` gives an upvote and `false` takes it back; giving one already given, or taking back one not given, changes nothing and is not counted. 403 `own` for one's own comment, 404 `gone` for a comment not shown (deleted, hidden, removed, or by a blocked account), 429 `limit` (`"cap": 500`) past 500 changes a day.
- `mine { offset?: number }` → `{ comments: Comment[], more: boolean }`
  - The caller's own comments and replies, newest first, twenty at a time; each with `"state": "live" | "hidden" | "removed"` and its text even when hidden or removed, so the writer knows.
- `delete { id }` → `{ ok: true, soft: boolean }` (one's own; a reviewer may delete any, which marks it removed)
  - `soft` is true when the comment had replies: its text and account are erased and a placeholder keeps its place. A placeholder whose last reply is deleted is erased too.
- `flag { id }` or `flag { user: "<username>" }` (a picture) → `{ ok: true }` (flagging the same thing twice is still `ok`)

## Actions for the team (`viewer` or `reviewer` in `chronia_team`)

- `queue` → `{ role, comments: Comment[] (every comment with flags > 0 or not live, newest first, at most 500; a reply with its `parent` and `root`, which the dashboard shows as "reply to #id"), pictures: [{ "username", "avatar", "user", "flags", "state": "ok" | "hidden" | "removed" }], blocked: [{ "username", "user" }] (blocked accounts, so a block can be undone), names: string[] (every distinct `polity` stored, for the page to find those no longer on the map) }`
- Reviewer only (a viewer gets 403 `review`):
  - `restore { id }` → `{ comment }` (live again, flags cleared)
  - `remove { id }` → `{ comment }`
  - `block { user: "<account id>", on: boolean }` → `{ ok: true }`
  - `picture { user: "<account id>", on: boolean }` → `{ ok: true }` (off removes the picture from public view; on restores a hidden one, or a removed one whose file is still kept, which it is for 30 days)
  - `move { from: string, to: string }` → `{ moved: n }` (every comment stored under `from` now under `to`)
  - `erase { user: "<account id>" }` → `{ ok: true }` (profile, picture file, comments, upvotes, and flags gone; its comments with replies by others stay as placeholders)
