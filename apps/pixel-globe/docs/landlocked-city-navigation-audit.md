# Landlocked settlement navigation audit

This audit compares the placed 1522 settlement catalog with the game's
ocean-reachable river, lake, and coastal topology. Run
`npm run audit:landlocked-cities` after changing cities, terrain, or rivers.

## Rescued water routes

These settlements had historically used water routes to open seas but were
landlocked by the coarse river bake:

| Settlement | Route represented |
| --- | --- |
| Hamburg, Magdeburg, Prague | Elbe and Vltava to the North Sea |
| Lyon | Rhone to the Mediterranean |
| Toulouse | Garonne and Gironde to the Atlantic |
| Cordoba | Guadalquivir to the Atlantic |
| Zaragoza | Ebro to the Mediterranean |
| Vilnius | Neris and Nemunas to the Baltic |
| Novgorod | Volkhov, Ladoga, and Neva to the Baltic |
| Smolensk, Kiev | Dnieper route to the Black Sea |
| Lahore | Ravi and Indus system to the Arabian Sea |
| Diyarbakir | Tigris raft route to Mesopotamia and the Persian Gulf |
| Plovdiv, Edirne | Maritsa to the Aegean |
| Chiang Mai | Ping and Chao Phraya system to the Gulf of Siam |

The abstraction represents shallow-draft historical river craft, seasonal
navigation, and documented portages rather than unrestricted passage by every
ocean-going hull.

## Deliberately left inland

Some settlements had substantial local navigation but no continuous
ocean-reachable route suitable for this game's sailing topology in 1522:

- Milan had an extensive navigable canal system, but its completed canal link
  to the Po and Adriatic dates to 1805.
- Moscow, Nizhniy Novgorod, and Kazan belonged to the Volga-Caspian basin;
  there was no Volga-Don ship canal.
- Pskov's route through Lake Peipus was interrupted by the Narva waterfalls.
- Srinagar, Mexico City, and Tzintzuntzan had important river or lake
  navigation inside closed or obstructed basins.
- Toledo's sustained Tagus navigation projects postdate the 1522 scenario.

Trakai shares a coarse world cell with the newly represented Vilnius-Neris
corridor. At this map resolution it is treated as the associated lake port
rather than splitting two settlements less than 30 km apart.

The remaining audited settlements lack a historically credible continuous
water route to an open sea at the game's scale. They remain connected to the
economy through the overland road and cart system.

## Historical basis

- [Hamburg](https://www.hamburg.com/visitors/port-anniversary/history-23092)
  and [Magdeburg](https://www.magdeburg-hafen.de/unternehmen-kontakt/geschichte.html)
  port histories document medieval Elbe shipping.
- The [Czech navigation authority](https://sps.gov.cz/organizace/historie)
  records Vltava navigation regulation from 920.
- Sources record medieval
  [Toulouse boatmen](https://documents.toulouse.fr/AToulouse/atoulouse_mai2022/version_accessible/patrimoine/de-leau-par-dessus-la-garonne.html),
  the ancient [Lyon-Rhone corridor](https://www.pianc.org/wp-content/uploads/2023/06/PIANC-History-Book.pdf),
  [late-medieval Ebro navigation](https://ifc.dpz.es/publicaciones/ver/id/3680),
  and [Cordoba's Guadalquivir wharves](https://helvia.uco.es/handle/10396/30511?locale-attribute=en).
- Sixteenth-century scholarship describes
  [grain shipped from Vilnius to Prussia](https://etalpykla.lituanistika.lt/object/LT-LDB-0001%3AJ.04~2007~1367160304782/J.04~2007~1367160304782.pdf)
  on the Neris and Nemunas.
- The [Varangian route](https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CV%5CA%5CVarangianroute.htm)
  connects Novgorod to the Baltic and Smolensk and Kiev to the Black Sea.
- Lahore scholarship identifies the
  [Ravi as a medieval trade artery](https://doi.org/10.47205/jdss.2024(5-III)19).
- [Plovdiv's municipal history](https://www.visitplovdiv.com/en/node/696)
  records the Maritsa as navigable to the Aegean, and Chiang Mai histories
  describe [boats built for the rocky Ping trade route](https://www.chiangmaicitylife.com/clg/our-city/lannas-lifeline-the-ping-river-and-life-surrounding-it/).
