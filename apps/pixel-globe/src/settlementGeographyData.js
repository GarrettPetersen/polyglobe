// Reviewed settlement landmasses at subdivision eight. IDs below 2000 use
// the checked-in world bake / world-atlas coastline identity; larger IDs are
// explicitly authored islands below the source raster resolution. Never assign
// island IDs from catalog order. See docs/geography-audits.md for the review.
export const SETTLEMENT_LANDMASSES = Object.freeze([
  landmass(57, "Afro-Eurasia", [
    "aden|yemen",
    "agra|india",
    "ahmedabad|india",
    "aleppo|syria",
    "alexandria|egypt",
    "algiers|algeria",
    "alkalawa|nigeria",
    "almeria|spain",
    "amber|india",
    "angers|france",
    "ankara|turkey",
    "antioch|syria/turkey",
    "arles|france",
    "athens|greece",
    "augsberg|germany",
    "avignon|france",
    "axum|ethiopia",
    "ayutthaya|thailand",
    "azemmour|morocco",
    "baghdad|iraq",
    "bakhchiserai|ukraine",
    "kezlev|ukraine",
    "barcelona|spain",
    "basra|iraq",
    "beijing|china",
    "bejaia|algeria",
    "belgrade|serbia",
    "berlin|germany",
    "bhimavaram|india",
    "binh dinh|vietnam",
    "bologna|italy",
    "bonn|germany",
    "bordeaux|france",
    "braila|romania",
    "bremen|germany",
    "brugge|belgium",
    "budapest|hungary",
    "bukhara|uzbekistan",
    "burgos|spain",
    "bursa|turkey",
    "cadiz|spain",
    "caen|france",
    "cairo|egypt",
    "calicut|india",
    "cambay|india",
    "ceuta|morocco",
    "chanderi|india",
    "changsha|china",
    "changzhou|china",
    "chengdu|china",
    "chiang mai|thailand",
    "chittoor|india",
    "cochin|india",
    "coimbra|portugal",
    "cologne|germany",
    "constantine|algeria",
    "cordoba|spain",
    "cremona|italy",
    "cuttack|india",
    "damascus|syria",
    "delhi|india",
    "dienne|senegal",
    "dijon|france",
    "diyarbakir|turkey",
    "dongola|sudan",
    "dresden|germany",
    "edirne|turkey",
    "erfurt|germany",
    "esfahan|iran",
    "feodosia|russian federation",
    "fez|morocco",
    "florence|italy",
    "fuzhou|china",
    "galati|romania",
    "gao|mali",
    "gauda|india",
    "gavle|sweden",
    "gdansk|poland",
    "gelibolu|turkey",
    "genova|italy",
    "gent|belgium",
    "goa|india",
    "granada|spain",
    "guangzhou|china",
    "guiyang|china",
    "gyeongju|republic of korea",
    "hamburg|germany",
    "hangzhou|china",
    "hannover|germany",
    "heidelberg|germany",
    "herat|afghanistan",
    "ikoso|guinea",
    "istanbul|turkey",
    "jaffa|israel",
    "jaunpur|india",
    "jeddah|saudi arabia",
    "jerusalem|israel",
    "jingdezhen|china",
    "jodhpur|india",
    "kabul|afghanistan",
    "kaesong|dem. people's republic of korea",
    "kaifeng|china",
    "kalmar|sweden",
    "kamtapur|india",
    "kano|nigeria",
    "karaman|turkey",
    "kashi|china",
    "kazan|russian federation",
    "kerman|iran",
    "kholmogory|russian federation",
    "kiev|ukraine",
    "kolar|india",
    "konya|turkey",
    "krakow|poland",
    "kunming|china",
    "lahore|pakistan",
    "leipzig|germany",
    "liege|belgium",
    "lisbon|portugal",
    "luanda|angola",
    "luang prabang|lao people's democratic republic",
    "lubeck|germany",
    "lyon|france",
    "m'banza-congo|angola",
    "madurai|india",
    "magdeburg|germany",
    "mainz|germany",
    "malacca|malaysia",
    "mali|mali",
    "mandu|india",
    "marrakech|morocco",
    "marseille|france",
    "massawa|ethiopia",
    "mecca|saudi arabia",
    "medina del campo|spain",
    "medina|saudi arabia",
    "metz|france",
    "milan|italy",
    "mogadishu|somalia",
    "mombasa|kenya",
    "montpellier|france",
    "moscow|russian federation",
    "mossel bay village|south africa",
    "mudanya|turkey",
    "multan|pakistan",
    "muscat|oman",
    "nanchang|china",
    "nanjing|china",
    "naples|italy",
    "nimes|france",
    "ningbo|china",
    "nis|serbia",
    "nizhniy novgorod|russian federation",
    "nkazargamu|nigeria",
    "novgorod|russian federation",
    "nurnberg|germany",
    "nykoping|sweden",
    "ohrid|bulgaria",
    "oporto|portugal",
    "oyo|nigeria",
    "paris|france",
    "patani|thailand",
    "patna|india",
    "pavia|italy",
    "pegu|myanmar",
    "pisa|italy",
    "plovdiv|bulgaria",
    "prague|austria",
    "pskov|russian federation",
    "quilon|india",
    "ragusa|croatia",
    "rajahmundry|india",
    "regensburg|germany",
    "reims|france",
    "riga|russian federation",
    "rome|italy",
    "rouen|france",
    "rufisque|senegal",
    "salerno|italy",
    "samarkand|uzbekistan",
    "san sebastian|spain",
    "seoul|republic of korea",
    "seville|spain",
    "shiraz|iran",
    "shkoder|albania",
    "siraf|iran",
    "sivas|turkey",
    "skopje|serbia",
    "smolensk|russian federation",
    "soderkoping|sweden",
    "soest|germany",
    "sofala|mozambique",
    "sofia|bulgaria",
    "speyer|germany",
    "srinagar|india",
    "stockholm|sweden",
    "suceava|romania",
    "suez|egypt",
    "surat|india",
    "suzhou|china",
    "szczecin|poland",
    "tabriz|iran",
    "taiyuan|china",
    "targoviste|romania",
    "thana|india",
    "thatta|india",
    "thessaloniki|greece",
    "tlemcen|algeria",
    "toledo|spain",
    "tombouctou|mali",
    "toulouse|france",
    "tours|france",
    "trabzon|turkey",
    "trakai|lithuania",
    "trier|germany",
    "tripoli|libya",
    "tsinkiang|china",
    "tunis|tunisia",
    "turku|finland",
    "turpan|china",
    "ujjain|india",
    "utrecht|netherlands",
    "valencia|spain",
    "valladolid|spain",
    "venice|italy",
    "verona|italy",
    "vienna|austria",
    "vijayanagar|india",
    "vilnius|lithuania",
    "warangal|india",
    "wesel|germany",
    "wittenberg|germany",
    "worms|germany",
    "wroclaw|germany",
    "wuhan|china",
    "xian|china",
    "yinchuan|china",
    "zaragoza|spain",
    "zimbabwe|zimbabwe"
  ]),
  landmass(120, "Americas", [
    "arequipa|peru",
    "asuncion|paraguay",
    "ayacucho|peru",
    "bogota|columbia",
    "boston|united states of america",
    "buenos aires|argentina",
    "caracas|venezuela",
    "chakan putum|mexico",
    "chanchan|peru",
    "charleston|united states of america",
    "chillicothe|united states of america",
    "cholula|mexico",
    "concepcion|chile",
    "coroa vermelha village|brazil",
    "cuzco|peru",
    "fort orange|united states of america",
    "guatemala city|guatemala",
    "gumarcaj|guatemala",
    "hartford|united states of america",
    "huancavelica|peru",
    "jamestown|united states of america",
    "lima|peru",
    "merida|mexico",
    "mexico city|mexico",
    "new haven|united states of america",
    "nombre de dios|panama",
    "ozette village|makah",
    "panama city|panama",
    "philadelphia|united states of america",
    "plymouth|united states of america",
    "port royal|canada",
    "potosi|bolivia",
    "providence|united states of america",
    "quebec|canada",
    "quito|ecuador",
    "recife|brazil",
    "rio de janeiro|brazil",
    "riobamba|ecuador",
    "salvador|brazil",
    "santiago|chile",
    "sao paolo|brazil",
    "st. augustine|united states of america",
    "tenayuca|mexico",
    "texcoco|mexico",
    "trois-rivieres|canada",
    "tzintzuntzan|mexico",
    "veracruz|mexico",
    "wendat village|canada",
    "xicalango|mexico",
    "zacatecas|mexico",
    "zempoala|mexico"
  ]),
  landmass(175, "Iceland", [
    "hafnarfjordur|iceland"
  ]),
  landmass(245, "Great Britain", [
    "bristol|united kingdom",
    "edinburgh|united kingdom",
    "exeter|united kingdom",
    "glasgow|united kingdom",
    "hull|united kingdom",
    "london|united kingdom",
    "newcastle upon tyne|united kingdom",
    "norwich|united kingdom",
    "southampton|united kingdom",
    "york|united kingdom"
  ]),
  landmass(253, "Gotland", [
    "visby|sweden"
  ]),
  landmass(280, "Zealand", [
    "copenhagen|denmark",
    "roskilde|denmark"
  ]),
  landmass(291, "Ireland", [
    "dublin|ireland"
  ]),
  landmass(356, "Newfoundland", [
    "st. john's|canada"
  ]),
  landmass(358, "Vancouver Island", [
    "yuquot village|nuu-chah-nulth"
  ]),
  landmass(396, "Hokkaido", [
    "akkeshi kotan|japan",
    "kaminokuni|japan"
  ]),
  landmass(414, "Corsica", [
    "bastia|italy"
  ]),
  landmass(420, "Honshu", [
    "edo|japan",
    "kyoto|japan",
    "naoetsu|japan",
    "sakai|japan",
    "tomogaura|japan",
    "tsuchizaki minato|japan",
    "yamaguchi|japan"
  ]),
  landmass(423, "Sardinia", [
    "cagliari|italy"
  ]),
  landmass(431, "Mallorca", [
    "palma|spain"
  ]),
  landmass(432, "Corfu", [
    "kerkira|greece"
  ]),
  landmass(441, "Terceira", [
    "angra|portugal"
  ]),
  landmass(450, "Sicily", [
    "messina|italy",
    "palermo|italy",
    "syracuse|italy"
  ]),
  landmass(482, "Rhodes", [
    "rhodes|greece"
  ]),
  landmass(487, "Malta", [
    "birgu|malta"
  ]),
  landmass(488, "Roanoke Island", [
    "roanoke|united states of america"
  ]),
  landmass(490, "Crete", [
    "iraklion|greece"
  ]),
  landmass(491, "Cyprus", [
    "nicosia|cyprus"
  ]),
  landmass(504, "Tsushima", [
    "tsushima fuchu|japan"
  ]),
  landmass(509, "Kyushu", [
    "fukuoka|japan",
    "kagoshima|japan",
    "nagasaki|japan"
  ]),
  landmass(520, "Madeira", [
    "funchal|portugal"
  ]),
  landmass(524, "Bermuda", [
    "st. george's|bermuda"
  ]),
  landmass(548, "Gran Canaria", [
    "las palmas|spain"
  ]),
  landmass(555, "Okinawa", [
    "naha|japan"
  ]),
  landmass(592, "Guanahani (San Salvador)", [
    "guanahani village|bahamas"
  ]),
  landmass(596, "Cuba", [
    "havana|cuba"
  ]),
  landmass(634, "Cozumel", [
    "cuzamil|mexico"
  ]),
  landmass(636, "Hawaii", [
    "hawaii village|hawaii"
  ]),
  landmass(639, "Hispaniola", [
    "santo domingo|dominican republic"
  ]),
  landmass(651, "Luzon", [
    "manila|philippines",
    "maynila|philippines"
  ]),
  landmass(653, "Puerto Rico", [
    "san juan|puerto rico"
  ]),
  landmass(688, "Santiago (Cape Verde)", [
    "ribeira grande|cape verde"
  ]),
  landmass(702, "Guam", [
    "umatac village|guam"
  ]),
  landmass(707, "Barbados", [
    "bridgetown|barbados"
  ]),
  landmass(710, "Socotra", [
    "suq|yemen"
  ]),
  landmass(765, "Sri Lanka", [
    "colombo|sri lanka"
  ]),
  landmass(771, "Yap", [
    "yap village|federated states of micronesia"
  ]),
  landmass(789, "Babeldaob", [
    "babeldaob village|palau"
  ]),
  landmass(799, "Borneo", [
    "bandar seri begawan|brunei"
  ]),
  landmass(800, "Pohnpei", [
    "nan madol|federated states of micronesia"
  ]),
  landmass(806, "Sumatra", [
    "aceh|indonesia"
  ]),
  landmass(808, "Kosrae", [
    "kosrae village|federated states of micronesia"
  ]),
  landmass(831, "Halmahera", [
    "gane village|indonesia"
  ]),
  landmass(834, "Sulawesi", [
    "garassiq|indonesia",
    "malangke|indonesia"
  ]),
  landmass(846, "Ternate", [
    "ternate|indonesia"
  ]),
  landmass(847, "Tidore", [
    "tidore|indonesia"
  ]),
  landmass(850, "Sao Tome", [
    "sao tome|sao tome and principe"
  ]),
  landmass(909, "Buru", [
    "buru village|indonesia"
  ]),
  landmass(913, "Ambon", [
    "hitu village|indonesia"
  ]),
  landmass(936, "Unguja (Zanzibar)", [
    "zanzibar|tanzania"
  ]),
  landmass(940, "Java", [
    "gresik|indonesia"
  ]),
  landmass(1002, "Tahuata", [
    "vaitahu village|french polynesia"
  ]),
  landmass(1027, "Rotuma", [
    "rotuma village|fiji"
  ]),
  landmass(1030, "Uvea", [
    "uvea village|wallis and futuna"
  ]),
  landmass(1036, "Upolu", [
    "samoa village|samoa"
  ]),
  landmass(1038, "Futuna", [
    "futuna village|wallis and futuna"
  ]),
  landmass(1067, "Viti Levu", [
    "fiji village|fiji"
  ]),
  landmass(1069, "Tahiti", [
    "tahiti village|french polynesia"
  ]),
  landmass(1079, "Niue", [
    "niue village|niue"
  ]),
  landmass(1090, "Lifou", [
    "lifou village|new caledonia"
  ]),
  landmass(1092, "Tongatapu", [
    "tonga village|tonga"
  ]),
  landmass(1093, "Rarotonga", [
    "rarotonga village|cook islands"
  ]),
  landmass(1106, "Rapa Nui", [
    "rapa nui village|rapa nui"
  ]),
  landmass(1110, "North Island", [
    "bay of islands village|aotearoa"
  ]),
  landmass(3015, "Male", [
    "male|maldives"
  ]),
  landmass(3019, "Banda Neira", [
    "banda village|indonesia"
  ]),
  landmass(3021, "Makian", [
    "makian village|indonesia"
  ]),
  landmass(3025, "Rangiroa", [
    "rangiroa village|french polynesia"
  ]),
  landmass(3026, "Tarawa", [
    "tarawa village|kiribati"
  ]),
  landmass(3029, "Mangareva", [
    "rikitea village|french polynesia"
  ]),
  landmass(3030, "Tubuai", [
    "tubuai village|french polynesia"
  ]),
  landmass(3032, "Chuuk", [
    "chuuk village|federated states of micronesia"
  ]),
  landmass(3033, "Majuro", [
    "majuro village|marshall islands"
  ]),
  landmass(3034, "Nauru", [
    "nauru village|nauru"
  ]),
  landmass(3035, "Banaba", [
    "banaba village|kiribati"
  ]),
  landmass(3039, "Funafuti", [
    "funafuti village|tuvalu"
  ]),
  landmass(3040, "Tokelau", [
    "tokelau village|tokelau"
  ]),
  landmass(3042, "Mactan", [
    "mactan village|philippines"
  ]),
  landmass(3999, "Mozambique Island", [
    "mozambique|mozambique"
  ]),
  landmass(4001, "Hormuz Island", [
    "hormuz|iran"
  ]),
  landmass(4002, "Kilwa Kisiwani", [
    "kilwa|tanzania"
  ]),
  landmass(4003, "Diu Island", [
    "diu|india"
  ]),
  landmass(4004, "Manhattan", [
    "new amsterdam|united states of america"
  ]),
  landmass(4005, "Montreal Island", [
    "ville-marie|canada"
  ]),
]);

function landmass(id, name, cityIds) {
  return Object.freeze({ id, name, cityIds: Object.freeze(cityIds) });
}
