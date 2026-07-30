const DARDANELLES_HEX_CHAIN = Object.freeze([98820, 98676, 98678, 24757]);
const BOSPORUS_HEX_CHAIN = Object.freeze([98682, 6233, 98694, 98704]);

export const MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze({
    Guangzhou: Object.freeze([61752, 15492, 92879]),
    Jingdezhen: Object.freeze([61646, 15465, 61859, 61651]),
    Florence: Object.freeze([162182, 40562, 162199]),
    Bologna: Object.freeze([40274, 161027, 98199]),
    Verona: Object.freeze([161032, 161027, 98199]),
    Changsha: Object.freeze([15508, 61803, 15502]),
    Wroclaw: Object.freeze([
      98257, 98256, 24642, 98242, 98239, 98238, 98440, 24692, 98474,
      98473,
    ]),
    Bremen: Object.freeze([98128, 98127, 98140]),
    Glasgow: Object.freeze([71858, 71857, 71934]),
    Hamburg: Object.freeze([98427, 98409, 6192, 98140]),
    Magdeburg: Object.freeze([98280, 98417, 24686, 98425, 98427]),
    Prague: Object.freeze([98296, 98297, 98293, 98277, 98276, 24652, 98280]),
    Lyon: Object.freeze([161095, 40292, 162219, 40573, 162221, 10152, 162210]),
    Toulouse: Object.freeze([10151, 162203, 162318, 162314, 162042, 160953, 40256]),
    Cordoba: Object.freeze([162135, 40354, 161342, 161345, 161343]),
    Zaragoza: Object.freeze([162350, 40601, 162352, 162351, 162344]),
    Vilnius: Object.freeze([99518, 99515, 24676, 98375, 24677, 98386, 24680]),
    Novgorod: Object.freeze([24836, 98998, 60, 55031, 13797, 55038]),
    Kiev: Object.freeze([
      99609, 99591, 6278, 99406, 24938, 99429, 24943, 99423, 24884,
      99168, 99167, 1589, 99387, 24933, 99460, 24951, 99473,
    ]),
    Smolensk: Object.freeze([
      99530, 99533, 24969, 99545, 24967, 99527, 6285, 99589, 24981,
      99609,
    ]),
    Lahore: Object.freeze([
      24284, 97961, 24572, 97998, 24581, 98013, 24583, 98008, 24565,
      97934, 1559, 97487, 24456, 97492, 97529, 97543, 97544, 97541,
      6159, 97510, 24463, 97514,
    ]),
    Diyarbakir: Object.freeze([102394, 102396, 102393, 25686, 102651, 25747]),
    Edirne: Object.freeze([98639, 98637, 1580, 98819]),
    Plovdiv: Object.freeze([98850, 98643, 24745, 98639]),
    "Chiang Mai": Object.freeze([
      93453, 23436, 93443, 23435, 93466, 23427, 93406, 5895, 93398,
      93399, 93401, 93272, 93271, 93279,
    ]),
  }),
});

export const MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS = {
  7: [
    [
      74294, 74295, 74300, 49366, 74299, 74312, 74313, 74311, 74310, 74357,
      74358, 74363, 74362, 74352, 74353, 74351,
    ],
    [48868, 48867, 3079, 48955, 48956],
    [136406, 136408, 136411, 34220, 136593],
    [129681, 32558, 129685],
    [92924, 23310, 92926],
    [61707, 61708, 61706, 61625, 987],
    [151665, 151676],
    [46520, 46519, 46531],
    [25502, 101645, 101916, 101905, 101923, 101922, 101909, 101910],
    [3710, 58698, 58714, 58713],
    [161138, 161175, 161176],
    // Seine connector from Paris through Rouen to the Channel.
    [161197, 161199, 40316, 161207],
    // Lower Euphrates/Tigris and Shatt al-Arab connector to the Persian Gulf.
    [
      25744, 102657, 25746, 102649, 102644, 102643, 102672, 102484,
      102485, 102491, 102490, 102478, 102480, 102477, 102230, 102232,
      25649,
    ],
    // Upper Tigris connector so Nineveh joins the Mesopotamian river route.
    [25747, 102654, 6479, 102646, 102647, 102644],
    // Karun/Karkheh approach from Susa into the lower Gulf river route.
    [102662, 102660, 102476, 102230],
    // Rhine corridor from the Low Countries through Cologne/Mainz to Speyer.
    [
      160887, 160886, 161172, 161174, 161055, 161056, 40282, 161057,
      161070,
    ],
    // Moselle spur from Metz/Trier into the Rhine corridor.
    [40285, 161075, 40282],
    // Loire connector from Tours to the Atlantic.
    [161167, 161169, 161162, 160967],
    // Vistula connector from Krakow to the Baltic.
    [
      99361, 99340, 98234, 98236, 98230, 24637, 98428, 98430, 98364,
      6211, 98379,
    ],
    // Yellow River and tributary spurs for major north China river cities.
    [62166, 62412, 62596, 15686],
    [62627, 62626, 62653, 62656],
    [62610, 62617, 62615, 62606],
    [62346, 252, 61367, 61368, 61374],
    // Yangtze/Han/Min river spurs.
    [61297, 15375, 61299, 3863],
    [62323, 62324, 62326, 62325],
    // Grand Canal from Beijing/Tianjin through the north China plain to Hangzhou.
    [
      15605, 62180, 15603, 62177, 15604, 62429, 15662, 62432, 62465,
      15671, 62481, 15673, 62476, 62474, 62402, 61616, 61617, 61620,
      61619, 61699, 61707, 15481, 61709, 3897, 61678,
    ],
    // Mekong/Tonle Sap approach for Angkor.
    [23399, 93282, 23390, 93245, 92992],
    // Rio de la Plata estuary from the Parana delta to the Atlantic coast.
    [6776, 106926],
    // Dardanelles passage from the Aegean side into the Sea of Marmara.
    DARDANELLES_HEX_CHAIN,
    // Bosporus passage from the Sea of Marmara into the Black Sea.
    BOSPORUS_HEX_CHAIN,
    // Historically navigable city corridors added for the 1522 port roster.
    ...Object.values(MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[7]),
  ],
};

// The coarse river bake incorrectly joins the Lancang/Mekong to the
// Jinsha/Yangtze across the drainage divide in northwest Yunnan.
export const MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    Object.freeze([92179, 92180]),
  ]),
});

export const MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS = {
  7: Object.freeze([...DARDANELLES_HEX_CHAIN, ...BOSPORUS_HEX_CHAIN])
};

export const MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS = {
  7: [
    { tile: 25502, edge: 0 },
    // Yukon delta branches into the Bering Sea.
    { tile: 47511, edge: 3 },
    { tile: 47521, edge: 2 },
    // Rio de la Plata opens into the South Atlantic beside Buenos Aires.
    { tile: 106926, edge: 2 },
  ],
};

export function removeBlockedRiverEdgesFromMasks(graph, masks, blockedEdges) {
  if (!graph || !Array.isArray(graph.edgeNeighbors)) {
    throw new Error("Blocked river edge removal requires a geodesic graph");
  }
  if (!(masks instanceof Uint8Array) || masks.length !== graph.tileCount) {
    throw new Error("Blocked river edge removal requires one mask per globe tile");
  }
  if (!Array.isArray(blockedEdges)) {
    throw new Error("Blocked river edges must be an array");
  }

  let removed = 0;
  for (const pair of blockedEdges) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error(`Blocked river edge must contain two tile ids: ${pair}`);
    }
    const [a, b] = pair;
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new Error(`Blocked river edge has invalid tile ids: ${a}, ${b}`);
    }
    const edgeA = graph.edgeNeighbors[a]?.indexOf(b);
    const edgeB = graph.edgeNeighbors[b]?.indexOf(a);
    if (!Number.isInteger(edgeA) || edgeA < 0 || !Number.isInteger(edgeB) || edgeB < 0) {
      throw new Error(`Blocked river tiles ${a} and ${b} are not adjacent`);
    }
    const bitA = 1 << edgeA;
    const bitB = 1 << edgeB;
    if ((masks[a] & bitA) === 0 || (masks[b] & bitB) === 0) {
      throw new Error(`Blocked river edge ${a}<->${b} is missing from the base river bake`);
    }
    masks[a] &= ~bitA;
    masks[b] &= ~bitB;
    removed += 2;
  }
  return removed;
}
