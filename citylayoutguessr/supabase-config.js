/* citylayoutguessr — where the account and scoreboard data lives.
 *
 * Fill these in from Supabase → Project Settings → API. Both are meant to be
 * public: the anon key is designed to sit in a web page, and the row-level
 * security policies in supabase/schema.sql are what actually protect the data.
 * Never put the service_role key here — it bypasses every policy.
 *
 * Left empty, the page never contacts Supabase: no sign-in, no board, no
 * counters, and the game plays exactly as it always has. See
 * SUPABASE-SETUP.md for the ten minutes of setup this needs.
 */
window.CLG_SUPABASE = {
  url: "",
  anonKey: ""
};
