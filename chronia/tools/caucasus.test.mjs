// node --test chronia/tools/caucasus.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { caucasusRows } from "./caucasus.mjs";

const day = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
const ownerOn = (unit, iso) => {
  const row = caucasusRows().find((r) => r.units.includes(unit));
  assert.ok(row, "no row for " + unit);
  const d = day(iso);
  return row.per.find((p) => p.a <= d && d <= p.b).k;
};

test("every row is checked and starts in 1445", () => {
  const rows = caucasusRows();
  assert.ok(rows.length > 40);
  for (const r of rows) for (let i = 1; i < r.per.length; i++) assert.equal(r.per[i].a, r.per[i - 1].b + 1, r.units[0]);
});

test("Kakheti follows the tripartition, the union of 1762, and the annexation of 1801", () => {
  assert.equal(ownerOn("GEO/Kakheti", "1450-07-01"), "GEORGIA");
  assert.equal(ownerOn("GEO/Kakheti", "1600-07-01"), "KAKHETI");
  assert.equal(ownerOn("GEO/Kakheti", "1780-07-01"), "KK");
  assert.equal(ownerOn("GEO/Kakheti", "1802-07-01"), "RUS");
});

test("Erivan is Ottoman only between the treaties of 1590 and 1612", () => {
  assert.equal(ownerOn("ARM/Yerevan", "1589-07-01"), "IRAN");
  assert.equal(ownerOn("ARM/Yerevan", "1600-07-01"), "OTT");
  assert.equal(ownerOn("ARM/Yerevan", "1640-07-01"), "IRAN");
  assert.equal(ownerOn("ARM/Yerevan", "1760-07-01"), "ERIVAN");
  assert.equal(ownerOn("ARM/Yerevan", "1828-07-01"), "RUS");
});

test("Baku is Russian from 1723 to 1735 and from 1806", () => {
  assert.equal(ownerOn("AZE/Baku", "1730-07-01"), "RUS");
  assert.equal(ownerOn("AZE/Baku", "1740-07-01"), "IRAN");
  assert.equal(ownerOn("AZE/Baku", "1800-07-01"), "BAKU");
  assert.equal(ownerOn("AZE/Baku", "1807-07-01"), "RUS");
});

test("the North Caucasus is never blank and Kabarda is Russian from Küçük Kaynarca", () => {
  assert.equal(ownerOn("RUS/Kabardino-Balkaria", "1700-07-01"), "KABARDIA");
  assert.equal(ownerOn("RUS/Kabardino-Balkaria", "1775-07-01"), "RUS");
  assert.equal(ownerOn("RUS/Chechen Republic", "1850-07-01"), "IMAMATE");
  assert.equal(ownerOn("RUS/Republic of Adygea", "1863-07-01"), "ZICHS");
  assert.equal(ownerOn("RUS/Republic of Adygea", "1865-07-01"), "RUS");
});
