// `node --test tools/worlds/test/` hands Node this folder, and Node 22 runs a
// folder by loading its index.js. So this file is the way in: it loads every
// test file beside it. (`node --test "tools/worlds/test/*.test.mjs"` runs the
// same tests, one process per file.)
import { readdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
for (const name of readdirSync(here).sort()) {
  if (name.endsWith('.test.mjs')) await import(new URL(name, here));
}
