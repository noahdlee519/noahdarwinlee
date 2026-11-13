# Sources for older first-level divisions

CHRONIA draws a country's first-level divisions (states, provinces, départements, and the like) only from the day its present units took shape, because they come from Natural Earth's admin-1 units of today (see the README's "First-level divisions"). France's therefore start in 1960, Germany's in 1949, China's in 1979, and Brazil's in 1975. This file lists the datasets found on 12 November 2026 that hold dated older divisions, so that a country's divisions can run back through their changes.

Every licence below was read on the dataset's own page or its repository's record on that day. Where a page gave no licence, it says so. **Non-commercial** marks a source that would rule out selling anything drawn from it (as CShapes 2.0 does already).

## The most useful, in order

| # | Source | What it holds | Licence | Where |
|---|--------|---------------|---------|-------|
| 1 | **OpenHistoricalMap** | Dated boundaries (`start_date`, `end_date`) of administrative units, worldwide but uneven. Its administrative-boundaries project lists Russia as complete; the United States, Canada, Mexico, Central America, Cuba, Brazil, Bolivia, Colombia, Ecuador, Guyana, Paraguay, Peru, Uruguay, Germany, Poland, Spain, the United Kingdom, Denmark, and Luxembourg as mapped; Italy mapped except Sicily; Austria, Finland, Ireland, Switzerland, the Netherlands, Ukraine, and Moldova as partial; and the Soviet Union from the 1950s to 1991 | CC0, except features tagged with their own open licence (`license=*`) | [copyright page](https://api.openhistoricalmap.org/copyright?locale=ja), [project status](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Projects/Administrative_Boundaries); Overpass API or planet files |
| 2 | **HistoGIS** (Austrian Academy of Sciences, ACDH) | Historical political and administrative units of Europe, mainly Central Europe, Austria(-Hungary), and the German states, about 1815 to 1919, each dated to the day (Kingdom of Bohemia 22 December 1867 to 31 October 1918, for one): the Austrian Empire's crown lands in 1815, 1848 to 1851, 1860, 1861, 1866, and 1867, Austria-Hungary's in 1870 and 1910, and 117 sources in all | CC BY 4.0 | [HistoGIS](https://histogis.acdh.oeaw.ac.at/shapes/sources/), GeoJSON per unit; the whole set on [ARCHE](https://arche.acdh.oeaw.ac.at/browser/oeaw_detail/105578) |
| 3 | **TRF-GIS** (Victor Gay) | Metropolitan France 1870 to 1940: départements, arrondissements, and cantons in annual shapefiles, with yearly lists of communes | CC BY 4.0 | [data.gouv.fr](https://www.data.gouv.fr/datasets/5f884b7e0f3bc23ceb5cd50f), from Harvard Dataverse |
| 4 | **ISTAT, *Confini delle unità amministrative*, historical series** | Italy's municipal boundaries for 1861, 1871, 1881, 1901, 1911, 1921, 1923, 1925, 1927, 1931, 1936, 1951, 1961, 1971, and 1981, and provinces from 1931; provinces and regions before 1931 can be made by joining the municipalities | CC BY 3.0 (ISTAT's licence for its open data) | [ISTAT](https://www.istat.it/notizia/confini-statistico-amministrativi-analisi-storica/), [licence](https://www.istat.it/en/press-and-products/open-data/) |
| 5 | **IBGE, *Evolução da divisão territorial do Brasil 1872–2010*** | Brazil's states and municipalities by census year from 1872 (Stanford holds the state files for 1933, 1940, and 1950, and municipalities for 1900, among others) | Public domain (Stanford's record of the 1940 states: "no restrictions on use") | [Stanford, states 1940](https://purl.stanford.edu/dm443sj2820), [the collection](https://purl.stanford.edu/pk905gn2555) |
| 6 | **Natural Resources Canada, *Territorial Evolution*** | Canada's provinces and territories on 23 dated maps: 1867, 1870, 1871, 1873, 1874, 1876, 1880, 1881, 1882, 1886, 1889, 1895, 1897, 1898, 1901, 1905, 1912, 1920, 1927, 1949, 1999, 2001, and 2003 | Open Government Licence – Canada | [map service](https://geoappext.nrcan.gc.ca/arcgis/rest/services/FGP/TE/MapServer) (lists GeoJSON among its query formats), [open.canada.ca](https://open.canada.ca/data/en/dataset/cb568551-8893-11e0-a3fc-6cf049291510) (PDF and JPG only) |
| 7 | **Riksarkivet's historical GIS maps, through `histmaps` and its successor `swehist`** | Sweden's counties (län) and parishes, 1600 to 1990 (only those two checked by the package's author) | Source data CC0; `swehist`'s data CC BY 4.0 | [junkka/histmaps](https://github.com/junkka/histmaps), [junkka/swehist](https://github.com/junkka/swehist) |
| 8 | **Transcultural Empire** (Heidelberg; Sablin and others, 2015) | The provinces of the Russian Empire at the census of 1897 and of the Soviet Union at that of 1926 | CC BY 4.0 (heiDATA's terms for the dataset) | [doi:10.11588/data/10064](https://doi.org/10.11588/data/10064) (heiDATA) |
| 9 | **HGIS de las Indias** (Stangl) | Spanish America's territorial organisation 1701 to 1808 in 11 levels (viceroyalties, audiencias, governorships, intendancies, and smaller), as a territorial gazetteer | CC BY 4.0 (World Historical Gazetteer's terms for its public datasets) | [Yale Dataverse](https://dataverse.yale.edu/dataverse/indias-hgis), [WHG](https://whgazetteer.org/datasets/8) |
| 10 | **MLIT, National Land Numerical Information, N03** | Japan's municipalities from 1920, with the prefecture of each, so prefectures can be made by joining | Free download; the product specification states no licence | [specification](https://nlftp.mlit.go.jp/ksj/gml/product_spec/KS-PS-N03-v2_4.pdf) |

## Useful but limited

- **Great Britain Historical Database** (Southall and others): England and Wales's administrative counties at each census, 1911 to 1971, and the registration counties 1851 to 1911. CC BY-SA 4.0, from the UK Data Service ([record](https://b2find.eudat.eu/dataset/9f0130bf-c38c-5226-b7cd-ef57c8f28ef5)). Britain's divisions already start in 1801, so this would only refine them.
- **China Historical GIS (CHGIS)**: provinces, prefectures, and counties as they changed from 221 BC to 1911, and whole coverages for 1820 and 1911. "Published for free academic use", with no licence named, so treat it as **non-commercial** ([Harvard CGA](https://gis.harvard.edu/china-historical-gis.md), [Dataverse](https://dataverse.harvard.edu/dataverse/chgis_v6)).
- **Mosaic / MPIDR Population History GIS Collection**: Germany's states and districts every year 1815 to 1945, and 1949 to 2009; Poland in 1770, 1897, 1931, 1970, and 1978; Serbia's districts 1865 to 1895; Austria-Hungary's court districts in 1910; and Europe in 1900, 1930, 1960, 1990, and 2003. "Freely used for **non-commercial** scientific purposes", after registering with the Mosaic project ([Mosaic](https://mosaic.ipums.org/historical-gis-datafiles)). HistoGIS and OpenHistoricalMap cover most of Germany without that limit.
- **The Ottoman Empire**: no open dataset of vilayets was found. The nearest is the Ottoman Anatolia Schooling HGIS, with 332 kazas (districts) of about 1899 to 1914 in part of Anatolia, under CC BY 4.0 ([README](https://emreamasyali.github.io/ottoman-anatolia-schooling-hgis/README.md)).

## Not usable

- **India**: the historical boundaries of states and districts 1951 to 2011 (ML InfoMap, through Stanford) are licensed to Stanford affiliates only and "may not be reproduced or used for any purpose without permission" ([record](https://purl.stanford.edu/mb214hn2157)). No open alternative was found; OpenHistoricalMap lists no status for India.
- **The Imperiia Project** (Harvard): its pages are under CC BY-NC-SA 4.0, and the datasets on its Dataverse were not checked one by one ([spatial data](https://imperiia.omeka.fas.harvard.edu/exhibits/show/data/spatialdata)).

## Countries and what would extend them

The start date is when CHRONIA's divisions began before this work; "Now" is what `tools/divisions-hist.mjs` adds (see the README's "First-level divisions").

| Country | Started | Now | From |
|---------|---------|-----|------|
| Canada | 1912 | **1867** | NRCan |
| Austria | 1958 | **1815 to 1918**, as the crown lands of the Austrian Empire and Austria-Hungary | HistoGIS |
| Prussia | none | **1815 to 1870**, its provinces | HistoGIS |
| Germany | 1949 | **1867 to 1945**, the states | OpenHistoricalMap |
| Italy | 1948 | **1861**, as compartimenti | ISTAT |
| Sweden | 1998 | **1720** | Riksarkivet via `swehist` |
| Mexico | 1935 | **1821** | OpenHistoricalMap |
| Brazil | 1975 | **1822** | OpenHistoricalMap (IBGE once `stacks.stanford.edu` or `geoftp.ibge.gov.br` is reachable) |
| France | 1960 (regions) | **1860**, as départements | TRF-GIS |
| Russia | 2008 | not yet: OpenHistoricalMap has fewer than half the governorates of 1900, and the Transcultural Empire's map is of the census of 1897 only, so its days would need dating from the decrees | Transcultural Empire; OpenHistoricalMap |
| Central and South America | 1884 to 1992 | not yet | OpenHistoricalMap; HGIS de las Indias before 1808 |
| Poland | 1999 | not yet | OpenHistoricalMap |
| China | 1979 | not yet: 1911 and earlier (non-commercial) | CHGIS; nothing open found for 1912 to 1949 |
| Japan | 1893 | about the same (prefectures barely changed after 1893) | MLIT N03 only refines |
| India | 1966 | nothing usable found | |

## What it would take

1. **Reaching the data.** Since 12 November 2026 this workspace reaches OpenHistoricalMap's Overpass API, HistoGIS, Harvard Dataverse (whose files come from `dvn-cloud-iqss.s3.amazonaws.com`), ISTAT, NRCan, heiDATA, and MLIT, besides GitHub and the package registries. Stanford's (`stacks.stanford.edu`, `purl.stanford.edu`) and IBGE's (`geoftp.ibge.gov.br`) servers are still refused, so IBGE's Brazil waits on those hosts being allowed on claude.ai (Settings > Capabilities).
2. **Fitting them to the map.** These shapes don't share Natural Earth's arcs, so each set has to be clipped to the country's own shape on each date and generalised to the detail of `data/divisions/`, and its outer edge dropped, since only internal lines are drawn.
3. **Dating them.** Where a source gives only census years (ISTAT, IBGE, the Transcultural Empire), each change between them has to be dated from the law or decree that made it, as `tools/divisions-ne.json` does now; HistoGIS, TRF-GIS, NRCan, and OpenHistoricalMap give dates or years already.
