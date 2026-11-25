# CHRONIA: replies, upvotes, and your comments in the profile

Design, 25 November 2026, building on `2026-11-24-chronia-comments-design.md` (comments as built and live) and its
contract, `docs/superpowers/plans/2026-11-24-chronia-comments-api.md`. Noah's answers of 24 November 2026 are marked
(Noah); the rest are Claude's calls and his to change.

## What Noah asked for

- Replies to comments, **fully nested up to 8 reply layers**, and opening a thread **opens a wider window** than the card (Noah).
- **Upvotes only**: one per account per comment, with the count shown, and it can be taken back (Noah).
- A **Top** order beside Newest and Nearest to the date (Noah).
- Clicking the profile icon at the top right shows **your comments and replies**, each with the country, the map date,
  the text, and its upvotes; pressing one opens that country's card at that date (Noah).

## Non-goals

- Notifications of replies, mentions, editing a comment, downvotes, and showing who upvoted.

## How it works

### Threads

- A comment either starts a thread (a *top* comment, as now) or replies to another comment (its *parent*).
- Depth: a top comment is depth 0; a reply is its parent's depth + 1, up to **8**. A reply to a comment at depth 8 is
  stored as a reply to that comment's parent, so it sits beside it at depth 8, and the composer says "Replying to
  @name" so the conversation still reads.
- A reply belongs to its parent's thread: it is stored under the parent's country name and keeps the parent's top
  comment (`root`). The writer's map date is stamped as for any comment.
- **On the card** (narrow): only top comments are listed, as now, each with its upvotes and a line under it:
  "Reply" and, if it has any, "{n} replies". Either opens the thread window.
- **The thread window** (wide): a panel over the map, `min(760px, 100vw - 2 × gap)` wide and nearly the screen's
  height, in the card's plate style, with the country's name, a close button (and Esc), and the top comment with
  every reply beneath it, each level indented 18 px (12 px on phones) with a faint rule down its left, so eight levels
  still fit. Each comment in it has its upvotes, "Reply", and "Report" or "Delete". "Reply" opens a small composer
  right under that comment. Replies are in order of time (oldest first) under each parent, so a conversation reads
  down the page.
- A thread with more than 400 comments shows the first 400 and says so (no paging inside a thread).

### Deleting

- Deleting one's own comment that has **no replies** erases it, as now.
- Deleting one's own comment that **has replies** erases its text and keeps its place: it shows as "Deleted comment",
  without name, picture, or upvotes, so the replies under it keep their thread. When its last reply is deleted, it is
  erased too.
- A comment hidden by three reports, or removed by a reviewer, shows in a thread as "Hidden comment" if it has replies
  (its text, name, and picture not shown), and is left out if it has none.
- Erasing an account (the team's Erase, or deleting the user) erases its comments; replies to them from other people
  stay, under a "Deleted comment" in their place. (my call; the alternative, erasing everyone's replies with them, loses
  other people's words.)

### Upvotes

- An upvote button with the count beside it on every comment, on the card and in the thread window: "▲ 3". Pressed, it
  is filled and counts the reader's vote; pressed again, the vote is taken back.
- Signed out, pressing it opens the Account panel. Without a profile, it asks for a username as commenting does.
- One's own comments show their count but can't be upvoted.
- Limits: 500 votes a day for each account (a vote and its taking back count as one each), against scripts.
- A deleted, hidden, or removed comment can't be voted on, and shows no count.

### Orders

- The card's line becomes "Newest | Top | Nearest to {date}". Top orders top comments by upvotes, then newest.
- Inside the thread window, replies under each parent are oldest first, whatever the card's order.

### Your comments in the profile

- The Account panel (the profile icon at the top right), signed in with a profile, gains **Your comments**: the
  account's comments and replies, newest first, twenty at a time with "More". Each shows the country's name, the map
  date, "Reply to @name" for a reply, the text cut to three lines, and its upvotes.
- Pressing one closes the panel, moves the map to that date, opens that country's card, and, for a reply, opens the
  thread window with that reply marked.
- A removed or hidden comment shows there as "Hidden from others" (the writer still sees their own text), so they know.
- Each has "Delete", as on the card.

## The contract (changes to `2026-11-24-chronia-comments-api.md`)

```
Comment  + { "parent": 456 | null, "root": 123 | null, "depth": 0..8, "votes": 3, "voted": true | false,
             "replies": 5 (top comments in `list` only), "deleted": true (only when shown as a placeholder) ,
             "replying_to": "username" | null }
```

- `list { names, sort?: "new" | "near" | "top", at?, offset? }`: top comments only (`parent` null); each with
  `replies`, the count of live replies under it at any depth.
- `thread { id }` (anyone) → `{ comments: Comment[], more: boolean }`: the top comment `id` (or the root of `id`, if
  it is a reply) and every reply under it, in order of `sent_at`; placeholders as above; at most 400.
- `post { name, at, text, parent? }`: with `parent`, a reply. Errors: 404 `gone` if the parent doesn't exist or is not
  shown, 400 `field` (`parent`) if the parent's thread is under a name other than `name`.
- `vote { id, on: boolean }` (signed in, with a profile) → `{ votes: n, voted: boolean }`. Errors: 404 `gone`,
  403 `own`, 429 `limit`.
- `mine { offset? }` (signed in) → `{ comments: Comment[] (with `polity`, `at`, `state` for one's own), more }`.
- `delete { id }`: as now, but soft when the comment has replies.
- `queue` (team): replies appear as comments do, with `parent` and `root`, so the dashboard can show "reply to #id".

## Data

A new migration, `supabase/migrations/202611250600_chronia_replies_votes.sql`, adding to the live tables without
changing a row's meaning:

- `chronia_comments` + `parent_id bigint references chronia_comments(id) on delete set null`, `root_id bigint`
  (indexed, null for a top comment), `depth smallint not null default 0 check (depth between 0 and 8)`,
  `votes integer not null default 0`, `deleted boolean not null default false`. Whichever way an account is erased
  (the team's Erase, or deleting the user in Supabase, which cascades), its comments that have replies must become
  placeholders (`deleted = true`, text gone, no account) rather than vanish with everyone's replies under them. A
  BEFORE DELETE trigger can't keep a row that a foreign-key cascade deletes, so the builder picks a sound way (for
  example, the account's key on comments becoming nullable with `on delete set null`, and a trigger on that update
  turning the row into a placeholder or deleting it if it has no replies), and the database tests prove both paths.
  The body check is relaxed to allow an empty body for a deleted comment only.
- `chronia_votes (user_id uuid references chronia_profiles on delete cascade, comment_id bigint references
  chronia_comments on delete cascade, sent_at timestamptz default now(), primary key (user_id, comment_id))`, closed
  as the other tables are (row-level security on, no grants to the page's roles).
- Database functions, each in one step under a lock as `chronia_comment_post` is: posting a reply (depth, root, name,
  and the 100-a-day cap shared with top comments), voting (counting the day's votes, updating `votes`), deleting
  (soft or hard, and erasing a placeholder whose last reply goes), the thread, and the account's own list.

## Words on the page

- The privacy policy (section 8) and terms (section 15) gain that replies and upvotes exist, that an upvote is
  stored with the account but its voter isn't shown to others, and that deleting a comment with replies leaves a
  "Deleted comment" in its place.
- New interface text is translated into the 13 other languages, as the comments' text was.

## Tests

- `deno test` in `supabase/functions/chronia-comments/` for the new actions and errors.
- `tools/db-test.sh` blocks for replies (depth cap, root, name), soft delete, votes and their cap, and account erase.
- `tools/chronia-comments-integration.sh` for the new actions against the real SQL.
- `tools/chronia-comments-check.mjs` for the card's upvotes and Top, the thread window (nesting to 8, reply composer,
  soft delete), and the profile's list (opening a card and a thread at its date), on a desktop and a phone.

## Going live

- The migration first (Noah runs it in Supabase's SQL editor if the tool asks for confirmation it can't show him), then
  the function (its entry file pinned to the new commit), then the page. The page treats a missing `votes` or `replies`
  as 0 and hides Reply and the thread window if `thread` is unknown, so the page and the function can ship in either
  order.
