import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { centralAsiaRows, buildCentralAsia } from "./central-asia.mjs";

const day = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
const ownerOn = (zone, iso) => {
  const row = centralAsiaRows().find((r) => r.zones.some((z) => zone === z || zone.startsWith(z + "/")));
  assert.ok(row, "no row for " + zone);
  const d = day(iso);
  return row.per.find((p) => p.a <= d && d <= p.b).k;
};

test("every row is checked and starts in 1500", () => {
  const rows = centralAsiaRows();
  assert.ok(rows.length > 40);
  for (const r of rows) for (let i = 1; i < r.per.length; i++) assert.equal(r.per[i].a, r.per[i - 1].b + 1, r.zones[0]);
});

test("every zone is in one row, and the zones file builds", (t) => {
  const modules = process.env.NODE_MODULES;
  if (!modules) return t.skip("set NODE_MODULES to a folder with topojson-client to build the zones");
  const client = createRequire(modules + "/")("topojson-client");
  const topo = JSON.parse(readFileSync(new URL("./central-asia-zones.json", import.meta.url), "utf8"));
  const polysOf = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  const C = buildCentralAsia({ topo, client, rewind: (p) => p, polysOf });
  assert.equal(C.zones, topo.objects.zones.geometries.length);
  assert.ok(C.spans.length > 100);
});

test("Tashkent: Kazakh from 1598, Dzungar from 1723, its own state from 1784, Kokand from 1810, Russian from 1865", () => {
  assert.equal(ownerOn("UZB/TASHKENT", "1550-07-01"), "BUKHARA");
  assert.equal(ownerOn("UZB/TASHKENT", "1650-07-01"), "KAZAKH");
  assert.equal(ownerOn("UZB/TASHKENT", "1730-07-01"), "DZUNGAR");
  assert.equal(ownerOn("UZB/TASHKENT", "1790-07-01"), "TASHST");
  assert.equal(ownerOn("UZB/TASHKENT", "1850-07-01"), "KOKAND");
  assert.equal(ownerOn("UZB/TASHKENT", "1865-06-28"), "KOKAND");
  assert.equal(ownerOn("UZB/TASHKENT", "1865-06-29"), "RUS");
});

test("the hordes: the Junior jüz Russia's from 1825, the Middle from 1823, the Senior's land Kazakh until Russia comes", () => {
  assert.equal(ownerOn("KAZ/Aktobe/Irgizskiy", "1700-07-01"), "KAZAKH");
  assert.equal(ownerOn("KAZ/Aktobe/Irgizskiy", "1800-07-01"), "JUNIOR");
  assert.equal(ownerOn("KAZ/Aktobe/Irgizskiy", "1825-07-01"), "RUS");
  assert.equal(ownerOn("KAZ/Karaganda/Ulytauskiy", "1800-07-01"), "MIDDLE");
  assert.equal(ownerOn("KAZ/Karaganda/Ulytauskiy", "1823-07-01"), "RUS");
  assert.equal(ownerOn("KAZ/Almaty/Almaty", "1740-07-01"), "DZUNGAR");
  assert.equal(ownerOn("KAZ/Almaty/Almaty", "1800-07-01"), "SENIOR");
  assert.equal(ownerOn("KAZ/Almaty/Almaty", "1852-07-01"), "KAZAKHS");
  assert.equal(ownerOn("KAZ/Almaty/Almaty", "1855-07-01"), "RUS");
});

test("Bukhara keeps its core; Samarkand Russian from May 1868; Shahrisabz apart from 1868 to 1870", () => {
  assert.equal(ownerOn("UZB/BUKHARA", "1880-07-01"), "BUKHARA");
  assert.equal(ownerOn("UZB/SAMARKAND", "1868-05-13"), "BUKHARA");
  assert.equal(ownerOn("UZB/SAMARKAND", "1868-05-14"), "RUS");
  assert.equal(ownerOn("UZB/KATTAKURGAN", "1868-07-04"), "BUKHARA");
  assert.equal(ownerOn("UZB/SHAHRISABZ", "1869-07-01"), "SHAHR");
  assert.equal(ownerOn("UZB/SHAHRISABZ", "1871-07-01"), "BUKHARA");
});

test("Khiva: the right bank Russian from the treaty of 1873, the khanate itself never Russian", () => {
  assert.equal(ownerOn("UZB/AMUDARYA", "1873-08-23"), "KHIVA");
  assert.equal(ownerOn("UZB/AMUDARYA", "1873-08-24"), "RUS");
  assert.equal(ownerOn("UZB/KHWARAZM", "1885-07-01"), "KHIVA");
});

test("Turkmen lands: Geok Tepe in 1881, Merv in 1884, Panjdeh in 1885", () => {
  assert.equal(ownerOn("TKM/AKHAL", "1880-07-01"), "TEKKE");
  assert.equal(ownerOn("TKM/AKHAL", "1881-07-01"), "RUS");
  assert.equal(ownerOn("TKM/MERV", "1800-07-01"), "BUKHARA");
  assert.equal(ownerOn("TKM/MERV", "1870-07-01"), "TEKKE");
  assert.equal(ownerOn("TKM/MERV", "1884-07-01"), "RUS");
  assert.equal(ownerOn("TKM/PANJDEH", "1885-07-01"), "RUS");
});

test("Kokand from 1709 to its annexation of 2 March 1876; Namangan Russian from October 1875", () => {
  assert.equal(ownerOn("UZB/FERGANA", "1700-07-01"), "BUKHARA");
  assert.equal(ownerOn("UZB/FERGANA", "1710-07-01"), "KOKAND");
  assert.equal(ownerOn("UZB/FERGANA", "1876-03-01"), "KOKAND");
  assert.equal(ownerOn("UZB/FERGANA", "1876-03-02"), "RUS");
  assert.equal(ownerOn("UZB/NAMANGAN", "1875-12-01"), "RUS");
});

test("the Pamirs: Darvaz Bukhara's from 1878, Shughnan and Wakhan Afghan from 1883", () => {
  assert.equal(ownerOn("TJK/DARVAZ", "1877-07-01"), "DARVAZ");
  assert.equal(ownerOn("TJK/DARVAZ", "1878-07-01"), "BUKHARA");
  assert.equal(ownerOn("TJK/SHUGHNAN", "1884-07-01"), "AFG");
  assert.equal(ownerOn("TJK/WAKHAN", "1884-07-01"), "AFG");
});
