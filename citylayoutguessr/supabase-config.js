/* citylayoutguessr — where the account and scoreboard data lives.
 *
 * Two values, both from the Supabase dashboard under Settings -> API Keys:
 *
 *   url      Project URL, https://<project-ref>.supabase.co
 *   anonKey  the PUBLISHABLE key. New projects show one starting sb_publishable_;
 *            older ones show a legacy "anon" key, a long string starting eyJ.
 *            Either works here — Supabase is retiring the legacy kind by the
 *            end of 2026, so prefer sb_publishable_ if you are shown both.
 *
 * Both are meant to be public: the publishable key is designed to sit in a web
 * page, and the row-level security policies in supabase/schema.sql are what
 * actually protect the data. Never put the secret key here — sb_secret_ or
 * service_role — it bypasses every policy.
 *
 * Left empty, the page never contacts Supabase: no sign-in, no board, no
 * counters, and the game plays exactly as it always has. See
 * SUPABASE-SETUP.md for the whole setup.
 */
window.CLG_SUPABASE = {
  url: "https://kigvciyyjlgjcgnwgrwf.supabase.co",
  anonKey: "sb_publishable_Ki-kbO5xBeMdVt3Ltv3i7A_dzQz2ivy"
};
