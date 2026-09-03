# Sign-in, the scoreboard, and analytics

The game works with none of this switched on. Everything below is additive: if
`supabase-config.js` is left empty, the page never contacts Supabase, no
sign-in button appears, and citylayoutguessr behaves exactly as it does today.
Fill the two values in and the account row, the daily leaderboard and the
counters all come to life.

There are two accounts to create, and only you can create them: a Supabase
project, and a Google OAuth client for it to talk to. Neither takes long.

---

## 1. Make the Supabase project

1. Go to <https://supabase.com>, sign in, **New project**.
2. Name it something you'll recognise — `citylayoutguessr` — pick a region near
   you, and let it generate a database password. Save that password in your
   password manager; you won't need it for the site, only for direct database
   access later.
3. Wait for it to finish provisioning (a minute or two).

## 2. Run the schema

1. In the project, open **SQL Editor -> New query**.
2. Paste the whole of `citylayoutguessr/supabase/schema.sql` and run it.
3. It creates three tables (`profiles`, `daily_scores`, `events`), the
   leaderboard view, two stats views, and the row-level security policies that
   decide who may read and write what. It is safe to run again if you change
   something later.

## 3. Make the Google sign-in client

Google needs to know which site is asking, and Supabase needs Google's client
ID and secret.

1. Go to <https://console.cloud.google.com>, create a project (any name).
2. **APIs & Services -> OAuth consent screen**. Choose **External**, fill in the
   app name (`citylayoutguessr`), your email as support and developer contact,
   and save. You do not need to submit it for verification — an unverified app
   can still sign in up to 100 people, which is plenty for you and your
   friends. Add anyone who should be able to sign in as a **Test user** while
   it is unverified, or click **Publish app** to let anyone in.
3. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID**.
   Application type **Web application**.
4. Under **Authorised JavaScript origins** add:

   ```
   https://noahdarwinlee.com
   ```

5. Under **Authorised redirect URIs** add the callback from your Supabase
   project — it is shown in Supabase under **Authentication -> Providers ->
   Google**, and looks like:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

6. Create it, and copy the **Client ID** and **Client secret**.

## 4. Connect the two

1. In Supabase: **Authentication -> Providers -> Google**. Turn it on, paste the
   client ID and secret, save.
2. In Supabase: **Authentication -> URL Configuration**.
   - **Site URL**: `https://noahdarwinlee.com`
   - **Redirect URLs**: add `https://noahdarwinlee.com/citylayoutguessr/`
     (and `http://localhost:8000/citylayoutguessr/` if you want to test
     locally).

## 5. Tell the site where to look

Open `citylayoutguessr/supabase-config.js` and fill in the two values from
**Settings -> API Keys** (the **Connect** button at the top of the dashboard
shows the same pair). Take the **publishable** key — `sb_publishable_...` on a
new project, or the legacy `anon` key beginning `eyJ` on an older one; either
works. Never the secret one:

```js
window.CLG_SUPABASE = {
  url: "https://xxxxxxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi..."
};
```

Both are meant to be public — the anon key is designed to sit in a web page,
and the row-level security policies from step 2 are what actually protect the
data. Do **not** put the `service_role` key here; that one bypasses every
policy and belongs only in the dashboard.

Commit, push, and the account row appears on the game page.

---

## What is stored

| Table | One row per | Who can read it | Who can write it |
|---|---|---|---|
| `profiles` | signed-in player | everyone | you, your own |
| `daily_scores` | player, per day | everyone | you, your own, today only, once |
| `events` | visit or login | **nobody** through the site | anyone, insert only |

`profiles` holds the name and picture Google gives us, because a leaderboard
needs something to put next to a score. `daily_scores` holds the count you got
right out of ten. `events` holds a row saying "someone loaded this page" or
"someone signed in" — a path, a referrer, a date, and the user id if there was
one. No addresses, no fingerprinting, nothing bought or sold.

## Reading your numbers

In the Supabase dashboard, **Table Editor** shows the raw rows and **SQL
Editor** runs anything you like. Two views are already there:

```sql
select * from stats_by_day limit 30;   -- visits, logins, games, per day
select * from stats_summary;           -- accounts, scores posted, visits
```

## What stops someone faking a score

The database, not the page:

- You must be signed in, and you can only write a row whose `user_id` is your
  own.
- The date is computed on the server in US Eastern, so you cannot post to a day
  that has passed or one that hasn't arrived.
- One row per person per day, enforced by a unique constraint. There is no
  update policy and no delete policy, so the first score you post is the one
  that stands — replaying the day doesn't overwrite it.
- `correct` must be between 0 and 10.

What that does *not* stop is someone opening the console and posting a 10/10
they didn't earn. Doing so properly means moving the answer checking to the
server — an Edge Function that receives the guesses and decides the score,
which is a bigger piece of work and worth doing only if the board starts
attracting that kind of attention. For a board you and your friends play on,
the constraints above are the right amount of ceremony.

## Turning it off

Empty the two values in `supabase-config.js`. The sign-in row and the board
disappear and nothing is sent anywhere. The data stays in Supabase until you
delete it.
