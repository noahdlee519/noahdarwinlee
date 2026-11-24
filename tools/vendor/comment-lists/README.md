# Word lists for CHRONIA's comments

Downloaded lists, kept here unchanged, from which `tools/build-comment-lists.mjs` writes `supabase/functions/chronia-comments/lists.ts`. They are data, read only as text. To update one, replace its file with the new version, run `node tools/build-comment-lists.mjs`, and run the rules' tests.

- **`en`, `cs`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `tr`, and `zh`**: the List of Dirty, Naughty, Obscene, and Otherwise Bad Words (LDNOOBW), one file for each of the site's languages, from github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words (commit 5faf2ba, 13 July 2020). Licence: Creative Commons Attribution 4.0 International, in `LDNOOBW-LICENSE`. Every entry refuses a username; the comments refuse only a short list chosen by hand from them, in the build script.
- **`usernames.txt`**: The Big Username Blocklist's `list.txt`, names reserved for a site's own use, from github.com/marteinn/The-Big-Username-Blocklist (commit c5d456f, 13 February 2021). Licence: MIT, in `USERNAMES-LICENSE`.
