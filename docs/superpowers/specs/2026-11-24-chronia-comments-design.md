# CHRONIA: profiles and comments on the country card

Design, 24 November 2026. Approved by Noah on 24 November 2026, with the age confirmation below added at his request. Calls marked "(my call)" are Claude's, not Noah's, and are his to change.

## Intent

A reader who is signed in should be able to say something about a country at the date they are looking at, under a name and a picture of their own, and other readers should see it on that country's card. Noah wants the atlas to have a community around its countries, tied to the map's dates, without the map's page becoming a place for abuse.

## What Noah decided (23 and 24 November 2026)

- **Profile pictures:** users upload their own.
- **Picture check:** every upload is checked automatically by an AI model before it goes live, and users can report a picture.
- **Usernames:** each user chooses one. Inappropriate and confusing names are refused, using public lists.
- **Where:** on the country's card, after the Sources section: a horizontal line, then the heading "Comments".
- **Who:** anyone can read. Only signed-in users can write.
- **Each comment shows:** the username, the profile picture, and the map date its writer was on.
- **Threads follow the country tag:** a country's comments stay with it through its changes of name (France as the Kingdom of France, the First Republic, and so on). An audit of the tags is wanted (see "The tags audit").
- **Order:** newest first, with a choice of "nearest to the date on screen".
- **Limit:** 100 comments a day for each user.
- **New comments:** go live at once, through a word filter.
- **Reports:** a comment reported by three different users is hidden. It then shows on the team's dashboard, where an admin can restore it.
- **Age:** a warning that a profile and comments are for people aged 13 and over, where the law asks for it.

## Goals

- A signed-in user can choose a username and upload a picture, and change either later.
- A country or people card ends with a Comments section that anyone can read.
- A signed-in user with a username can post a comment of up to 500 characters, stamped with the map's date.
- A user can delete their own comment and report anyone else's comment or picture.
- The team can see reported and hidden comments and pictures on the Reports page, and restore, remove, or block.
- The section matches the card: the same type, colours, rules, and `|` separators as the rest of the page.

## Non-goals

- Replies, likes, mentions, notifications, and editing a comment (delete and post again).
- Comments on cities, divisions, lakes, and seas.
- Changing the country tags themselves. The audit reports; applying it is a separate change, since tags also set the map's colours.
- Translating the new interface text in this change if it would hold it up (see "What's left to the builder").

## Anti-goals

- A picture or a name that reaches other readers without having passed its check.
- Text from a user ever being put on the page as HTML.
- The page talking to the database directly. Everything goes through one server function, as reports do.
- A filter that blocks history. "Rape of Nanjing", "slave trade", "Nazi Germany", and "Essex" must all be sayable.

## Approach

One way fits how CHRONIA is already built, so only one is proposed.

- **Chosen: a new server function, `chronia-comments`, with its own tables.** This is how error reports work today (`chronia-report`): the page posts JSON with an `action`, the function checks the Google session, applies the limits and the filters, and reads and writes tables the page itself can't touch.
- **Not chosen: the page reading and writing the tables directly**, with database rules deciding who may do what. The page has no database client today, and the filters and the picture check have to run on a server anyway.
- **Not chosen: an outside comment service** (Disqus, Giscus). It couldn't stamp the map's date, follow the country tags, or match the page's look.

## How it works

### Accounts and profiles

- Sign-in stays as it is: Google, through the session the report panel keeps (`reportSession`).
- A profile is a username and, optionally, a picture. A user without a picture shows as their initial on a coloured disc, as the account button does now.
- The Account panel gains the profile: picture, username, and "Edit profile". The header's account button shows the picture once there is one.
- The first time a signed-in user tries to comment, the composer asks for a username in place.

### Age (added at Noah's request)

- Making a profile needs a ticked box: "I am 13 or older, and old enough in my country to use this without a parent's consent (16 in some of Europe)." The profile isn't made without it, and the function refuses a profile whose request lacks it. The time it was ticked is kept with the profile.
- The box is a statement by the user, not a check of their age: the page asks for no birth date and keeps none.
- The terms say that profiles and comments are for people aged 13 and over (or the higher age their country sets), and the privacy policy says CHRONIA does not knowingly keep a profile or comments from a child under 13 and erases them when it learns of one.
- The team's dashboard can erase an account's profile and comments outright, for a user found to be under age.
- Reading the map and its comments needs no account and has no age box.
- Why: in the United States, COPPA asks for a parent's verified consent before a site that knows a user is under 13 collects their personal information; in the European Union the age for consenting to an online service is 16 unless a member state sets it lower, and never below 13; in the United Kingdom it is 13. This is a common practice for a general-audience site, not legal advice; a lawyer should read the terms before CHRONIA relies on them.

### Usernames

- 3 to 20 characters: Latin letters, digits, and underscores, beginning with a letter.
- Unique without regard to case (`Noah` and `noah` are one name).
- May be changed once every 30 days.
- A name is refused if, lowercased, with underscores removed and look-alike digits read as letters (0 as o, 1 as l or i, 3 as e, 4 as a, 5 as s, 7 as t):
  - it is on the reserved list: The Big Username Blocklist (MIT) plus the site's own (chronia, uchronia, noah, noahdarwinlee, admin, administrator, moderator, mod, team, staff, official, support, editor, and the like);
  - it contains a word from the List of Dirty, Naughty, Obscene, and Otherwise Bad Words (LDNOOBW, CC BY 4.0), English and the site's other languages. Words of four letters or fewer must match a whole part of the name (split at underscores, digits, and capitals), so that "Essex" and "Titus" pass; longer words match anywhere. A short list of known false alarms is allowed through (Scunthorpe, Middlesex, assassin, and so on).
- The lists live in the function, not the page. The page asks the function whether a name is free and allowed as the user types.

### Pictures

- The page crops the chosen image to a centred square, scales it to 256 by 256, and re-encodes it as WebP (JPEG where WebP can't be written). That strips the file's metadata. The result is sent to the function, which refuses anything over 200 KB or not a WebP, JPEG, or PNG by its first bytes.
- The function asks Claude (the model the country notes already use, `claude-haiku-5-5`, with the key already on the server) whether the picture suits a public profile on an all-ages history site. It refuses sexual content, graphic violence, hate symbols, and harassing text in the image. If the model can't be reached, the upload is refused with "try again later".
- An accepted picture is stored in a public storage bucket, `chronia-avatars`, under a random name. Only the function can write to it.
- A user may change their picture five times a day.

### Comments

- **Thread:** a card's thread is every comment posted under any name of its country tag (`data/tags.json`), or under its own name if it has no tag. Each comment is stored with the name it was posted under, and the page sends the tag's list of names when it asks for a thread. So when the tags change, threads regroup without touching stored comments.
- **A country renamed in a data build (my call):** its comments would be left under a name no longer on the map. The team's dashboard lists comments whose name the map no longer has, and a reviewer can move them to a name it does. A check, run after a build, prints the stored names the new data lacks. No build step rewrites comments.
- **Heading:** "Comments" for an untagged country; "Comments on France" for a tagged one, so the reader knows the thread spans its names.
- **A comment:** picture, username, the map date its writer was on (pressing it moves the map to that date), and the text. Then "Report", or "Delete" on one's own.
- **Order:** "Newest | Nearest to {date on screen}". Twenty at a time, with "More".
- **Composer:** a text box with a count to 500 and a button, "Post as {username} on {date}". Signed out, it reads "Sign in to comment" and opens the Account panel.
- **Limits:** 100 comments a day for each user (the day is UTC, as for reports), and at most one every 10 seconds.
- **Filter:** a comment is refused, with a plain message asking the writer to reword it, if it contains a word from a short list of slurs and explicit obscenities (chosen from LDNOOBW, whole words only), or a web address. It is not the usernames' longer list: history's own vocabulary is allowed.
- Text is stored as plain text and shown with `textContent`.

### Reports and moderation

- A signed-in user may report a comment or a picture, once each, up to 20 reports a day.
- A comment reported by three different users is hidden from the thread. A picture reported by three is replaced by the initial.
- **The team's dashboard** is the Reports page (`/reports/`). It gains a "Comments" list for the team: every reported or hidden comment and picture, with its text, its writer, and its count of reports. A reviewer can **Restore** (the appeal Noah asked for), **Remove**, or **Block** the account (its comments are hidden and it can't post). Remove and Block can be undone from the same list.
- A reviewer also sees "Remove" on every comment on the card itself.

### What is erased and what is kept (my call)

- **A user deletes their own comment:** the comment and the reports of it are erased.
- **A reviewer removes a comment or a picture:** it is no longer public, and the record is kept for the team, so that a removal can be reviewed and undone. A removed picture's file is erased after 30 days.
- **An account is deleted** (on request, as the privacy policy already promises for reports): its profile, its picture file, its comments, and the reports it made are all erased.

### Data

Three tables and one bucket, all closed to the page (row-level security on, no grants to `anon` or `authenticated`), as the reports' tables are:

- `chronia_profiles`: the account, username, the username's lowercase key (unique), picture path, picture state, when the name last changed, blocked or not.
- `chronia_comments`: the account, the country's name, the map date as text and as a number (for "nearest"), the text, the state (live, hidden, removed), when it was posted.
- `chronia_flags`: who reported which comment or whose picture.
- A database function posts a comment and counts the day's comments in one step under a lock, as `chronia_report_send` does, so a burst can't pass the cap.

### Words on the page

- The privacy policy and the terms gain what is kept (username, picture, comments, and reports), that comments and profiles are public, the rules for what may be posted, and how to have something removed.
- The Sources page credits LDNOOBW, as its licence asks.

## The tags audit

Noah asked for an audit of the country tags. Today there are 56 tags covering 216 of the map's 4,397 names; 42 names listed in tags are not on the map. Tags also set a country's colours, so adding one changes the map and needs a data build.

The audit is **not part of this build**. It is a separate piece of work that can run alongside it: a report, by region, of names that belong to an existing tag, countries that deserve a new tag, and tag names that match nothing, with the rule it used for "the same country" stated at its head, for Noah to approve before any of it is applied. Because comments are stored by name, nothing here has to wait for it. Until it is applied, a country with no tag has one thread for each of its names.

## What's left to the builder

- The exact wording of the interface text and the refusal messages, in the page's voice.
- Translations of the new text into the site's 13 other languages: with this change if cheap, otherwise English first (the page falls back to English).
- The thresholds named above may be constants at the top of the function.
- How the card loads a thread (on opening, with a short cache) so that opening cards stays quick.
- Tests: the name and word rules as unit tests on their own module; the card's section against a stand-in server; the database function on a Supabase branch or by hand.

## Going live

- The migration, the bucket, and the function are applied to the live Supabase project (`jvcmeuqlyygpwelmvxuv`). The function uses `ANTHROPIC_API_KEY`, already set there.
- The page change ships with the function. If the function is not reachable, the card shows no Comments section and nothing else changes.
