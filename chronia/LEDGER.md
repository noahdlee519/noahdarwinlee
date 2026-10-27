# CHRONIA's ledger

One entry per change to the maps, newest first, as [MAPMAKING.md](MAPMAKING.md#the-ledger) describes. A claim in progress is an entry with "Claimed by" and the date, replaced by the finished entry when the work is done.

Each entry:

```
## <years> | <region> | <polity or subject>

- What changed: …
- Tables: …
- Sources: (1) … (2) …
- Confidence: high, medium, or low, because …
- Alternatives: …
- Left out: …
```

---
## 1945–1990 | Central Europe | the inner German border

- What changed: East Germany (the Soviet zone from 8 May 1945, the German Democratic Republic from 5 October 1949) and West Germany (the western zones, then the Federal Republic) now meet along the boundary between today's five eastern states and Berlin and the western states, instead of CShapes' line, which put Wolfsburg, Helmstedt, and the western Harz in the east. The two states' shapes are joined and split along Natural Earth's state boundaries, keeping CShapes' coast and outer borders. Berlin stays whole in East Germany, as CShapes has it.
- Tables: `CS_REDRAW` (new) in `tools/build-eras.mjs`, gw 265 and 260, from 1945-05-08 to 1990-10-02.
- Sources: (1) The Ländereinführungsgesetz of 22 July 1990 and the Unification Treaty (Einigungsvertrag, 31 August 1990, Article 1) re-established the five eastern states as the territory of the GDR, so their outer boundary is the inner German border; summarised at https://en.wikipedia.org/wiki/New_states_of_Germany. (2) Natural Earth's 10m admin-1 states and provinces, for the boundary's course. (3) The one later change: Amt Neuhaus, east of the Elbe, was in Mecklenburg and the GDR from 1945 and went to Lower Saxony on 30 June 1993 (https://en.wikipedia.org/wiki/Amt_Neuhaus).
- Confidence: high, because the line is the boundary of the present states, which were rebuilt on the GDR's territory in 1990; only Amt Neuhaus differs.
- Alternatives: CShapes 2.0's own line, which is visibly wrong at Wolfsburg and in the Harz.
- Left out: Amt Neuhaus (about 237 km²) is drawn in West Germany, because Natural Earth has no unit for it. The 1945 zone boundaries in the west (British, American, and French zones) and West Berlin are not shown: CShapes gives the western zones as one span under American occupation, and Berlin whole in the east.

## 1400 to 2019 | the world | overlapping shapes, disputed land, and colours by date

- Claimed by Claude session 012Avzuib4tb8ZJHvk13M4TH, 27 October 2026: `resolveOverlaps`, `dissolveFeat`, and `unionSafe` (shapes over each other, and pieces of one state stacked on its own land); `DISPUTES` and the striped disputed land (status 6); `NO_LINK`, `COLOUR_FROM`, and `windowColours` (a state in another colour only while it touches a neighbour of its own colour). Please leave these to this session until the finished entry replaces this claim.

