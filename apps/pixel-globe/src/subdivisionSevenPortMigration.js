import { indexEntitiesById } from "./entityIds.js";

// Generated from the released subdivision-seven port sailing endpoint catalog,
// with the pre-correction Tarawa endpoint retained for older saves. Six cities
// which are correctly inland at subdivision eight are redirected to an authored,
// navigable port serving the same polity or local region.

// The released Dienne endpoint (158826) now resolves to Djenne itself after
// its Senegal geocoding was corrected; Timbuktu (163712) remains distinct.
export const SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT = 310;

const SERIALIZED_SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILES =
  "1581:161765,2459:624802,3948:249669,4526:287251,4645:294699,4702:298482,4714:4714,5632:356017,5827:368848,6203:644136,6261:396848,9532:607193,9724:9724,9739:620908,9769:622694,10067:644421,10151:10151,10152:162210,15479:15479,15508:15508,15521:247002,15605:15605,15782:251131,16050:16050,16404:261154,16406:261182,16418:16418,16479:262453,16921:16921,18006:18006,18401:294413,18466:294245,19614:78243,19917:317280,21751:21751,22330:22330,22362:355983,22375:356127,22761:379607,22966:22966,23005:366292,23338:371421,24278:386720,24284:24284,24432:24432,24629:24629,24649:392432,24653:392535,24683:392949,24684:392979,24687:393294,24688:24688,24695:393293,24784:394414,24791:394549,24836:24836,24932:99402,24947:397117,25169:25169,25257:25257,25502:405854,25506:405910,25648:409227,26275:418059,26512:421514,26854:426721,31592:31592,34419:34419,34610:34610,38902:621351,38984:38984,39054:623907,39426:39426,40243:643467,40274:648588,40281:644072,40285:40285,40303:644427,40312:644588,40316:40316,40355:645235,40370:645402,40440:646547,40551:40551,40562:40562,40564:648620,46523:185827,46555:46555,48918:49949,49949:49949,50594:202033,55095:220062,55099:55099,55603:55605,60554:60554,61297:244788,61538:61538,61636:246938,61646:246985,61678:246283,61681:246295,61706:246415,61707:246403,61752:246568,61836:61836,62460:249403,62610:250058,62627:250102,64342:261091,64993:259517,65382:261380,65393:261140,65406:65406,65413:261221,65565:261840,65606:262000,65618:65618,65639:65639,65727:262516,67580:269929,67709:270430,67971:271694,68532:68532,69450:277347,71858:287102,72876:291080,73682:294323,74307:298719,74310:297098,74313:296827,74338:74340,74340:18641,74361:297004,74569:297830,74783:18749,74788:298724,74808:298683,74825:298882,76559:76559,78229:312499,79421:317231,84770:84770,85318:340714,86665:86665,88415:352953,89076:89076,89494:357368,89746:358401,90076:90076,90267:90267,90803:363767,91677:366120,91681:366134,91683:366344,91718:366350,91735:366359,91800:366615,92492:369345,93182:372151,93272:372461,93327:93327,93453:373213,95071:379627,95304:380551,95697:382107,96083:96083,97511:389371,98013:98013,98128:392985,98208:396515,98217:392538,98257:392385,98273:644162,98278:392449,98280:98280,98296:392562,98302:392558,98335:98335,98336:392690,98337:392698,98341:392732,98411:392993,98427:393058,98438:98438,98465:393227,98474:393256,98541:98541,98639:98639,98670:394133,98676:98676,98694:394133,98751:394799,98772:394384,98803:98803,98827:394627,98850:394704,98888:394865,99175:55605,99361:396757,99381:396840,99453:397118,99515:99518,99518:397385,99530:99530,99609:397772,101051:403450,101163:101163,101738:405854,101857:406788,101883:406788,101903:406360,101905:406890,101929:101929,102280:408401,102316:102346,102379:408818,102394:408881,102672:410160,104847:104847,105823:105823,107180:427729,107878:430596,122199:122199,124671:497668,124740:497864,125893:502418,130348:520323,134185:535761,134664:134664,134862:538749,136803:312499,136831:546417,136966:136966,137225:547985,137444:137444,137756:550088,138615:553648,138705:553961,141773:141773,142904:570899,143441:573047,143707:574230,143888:143888,143938:575023,152555:152555,153117:612156,154838:619024,154846:154846,154941:619432,155087:155087,155154:620317,155385:621196,155433:621372,155458:621479,155810:622870,156249:156249,158826:162642,159153:636414,160114:160114,160876:643564,160888:160888,160912:643237,160923:643561,161031:643985,161032:643991,161053:644093,161056:160882,161057:161057,161070:644137,161075:644156,161095:644228,161138:644682,161146:644451,161167:644530,161169:644541,161174:644561,161189:161189,161193:644708,161197:644664,161303:645110,161342:645249,161365:161368,161480:647977,161487:645775,161491:645826,161726:646755,161755:646871,161762:646896,161777:646942,161794:647020,161865:161865,161912:647473,161924:647524,161948:647622,162042:162042,162135:162135,162157:648484,162158:648484,162182:162182,162196:648650,162221:648742,162253:648936,162311:649136,162340:649233,162341:162341,162350:649289,163196:652728,163688:655190,163712:654806,21837:270430";

export const SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS = new Map(
  SERIALIZED_SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILES.split(",").map((pair) => {
    const [savedTileIdText, currentTileIdText] = pair.split(":");
    const savedTileId = Number(savedTileIdText);
    const currentTileId = Number(currentTileIdText);
    if (!Number.isInteger(savedTileId) || !Number.isInteger(currentTileId)) {
      throw new Error(`Invalid subdivision-seven port migration pair: ${pair}`);
    }
    return [savedTileId, currentTileId];
  })
);

if (SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.size !==
    SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT) {
  throw new Error(
    `Subdivision-seven port migration has ` +
      `${SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS.size} entries; ` +
      `expected ${SUBDIVISION_SEVEN_PORT_MIGRATION_COUNT}`
  );
}

export function subdivisionSevenPortMigrationForWorld({
  savedSubdivisions,
  currentSubdivisions
}) {
  if (savedSubdivisions === currentSubdivisions) return null;
  if (savedSubdivisions !== 7 || currentSubdivisions !== 8) {
    throw new Error(
      `No port migration exists for subdivision ` +
        `${savedSubdivisions} to ${currentSubdivisions}`
    );
  }
  return SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS;
}

export function subdivisionSevenPortReferenceCatalog(portCities, colonySites) {
  if (!Array.isArray(portCities) || !Array.isArray(colonySites)) {
    throw new Error("Subdivision-seven port migration requires port and colony-site catalogs");
  }
  const referencesByTileId = new Map();
  const referencesByCityId = new Map();
  const referenceDiagnosticPrefix = "Current port reference";
  // A founded colony occurs in both catalogs. Its canonical identity and
  // placement must agree; the live port supplies its current name and history.
  for (const catalog of [portCities, colonySites]) {
    const uniqueReferences = indexEntitiesById(catalog, {
      idField: "cityId", label: referenceDiagnosticPrefix
    });
    for (const reference of uniqueReferences.values()) {
      if (!Number.isInteger(reference.tileId)) {
        throw new Error(`Invalid current port reference tile: ${reference.tileId ?? "missing"}`);
      }
      const existingCity = referencesByCityId.get(reference.cityId);
      if (existingCity && existingCity.tileId !== reference.tileId) {
        throw new Error(`Conflicting tiles for current port reference ${reference.cityId}: ` +
          `${existingCity.tileId}/${reference.tileId}`);
      }
      const existing = referencesByTileId.get(reference.tileId);
      if (existing && existing.cityId !== reference.cityId) {
        throw new Error(`Conflicting current port reference tile: ${reference.tileId} ` +
          `(${existing.cityId}/${reference.cityId})`);
      }
      if (existing) continue;
      referencesByTileId.set(reference.tileId, reference);
      referencesByCityId.set(reference.cityId, reference);
    }
  }
  for (const [savedTileId, currentTileId] of SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS) {
    if (!referencesByTileId.has(currentTileId)) {
      throw new Error(
        `Saved port tile ${savedTileId} targets missing current port or colony site ${currentTileId}`
      );
    }
  }
  return Object.freeze([...referencesByTileId.values()]);
}

export function orphanedSubdivisionSevenPortTileIds(currentPlacements) {
  if (!Array.isArray(currentPlacements)) {
    throw new Error("Orphaned subdivision-seven port recovery requires current placements");
  }
  const currentTileIds = new Set();
  for (const placement of currentPlacements) {
    if (!Number.isInteger(placement?.tileId)) {
      throw new Error(`Invalid current placement tile: ${placement?.tileId ?? "missing"}`);
    }
    currentTileIds.add(placement.tileId);
  }
  const orphaned = new Map();
  for (const [savedTileId, currentTileId] of SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS) {
    if (!currentTileIds.has(currentTileId)) {
      throw new Error(
        `Orphaned saved port tile ${savedTileId} targets missing current placement ${currentTileId}`
      );
    }
    if (!currentTileIds.has(savedTileId)) orphaned.set(savedTileId, currentTileId);
  }
  return orphaned;
}
