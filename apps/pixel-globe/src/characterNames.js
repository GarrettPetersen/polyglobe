const CULTURES = Object.freeze({
  english: culture(
    ["John", "William", "Thomas", "Richard", "Robert", "Edward", "Henry", "George", "Nicholas", "Christopher", "Francis", "Martin"],
    ["Alice", "Anne", "Elizabeth", "Joan", "Margaret", "Mary", "Agnes", "Catherine", "Dorothy", "Eleanor", "Isabel", "Jane"],
    ["Smith", "Baker", "Cooper", "Fletcher", "Hawkins", "Clarke", "Bennett", "Turner", "Barrett", "Carter", "Atwood", "Whitmore"]
  ),
  scottish: culture(
    ["Alasdair", "Andrew", "Archibald", "Colin", "David", "Duncan", "Gavin", "Gilbert", "Hugh", "James", "Robert", "William"],
    ["Agnes", "Alison", "Beatrix", "Catriona", "Christian", "Elspeth", "Helen", "Isobel", "Janet", "Katherine", "Margaret", "Marion"],
    ["Campbell", "Douglas", "Gordon", "Graham", "Hamilton", "Kerr", "Lindsay", "MacDonald", "MacLeod", "Murray", "Stewart", "Wallace"]
  ),
  french: culture(
    ["Antoine", "Claude", "Etienne", "Francois", "Geoffroy", "Guillaume", "Jacques", "Jean", "Laurent", "Louis", "Martin", "Pierre"],
    ["Anne", "Catherine", "Charlotte", "Claude", "Francoise", "Isabeau", "Jeanne", "Louise", "Marguerite", "Marie", "Perrine", "Renee"],
    ["Arnaud", "Bernard", "Boucher", "Charpentier", "Dubois", "Fournier", "Garnier", "Laurent", "Lefevre", "Marchand", "Moreau", "Roux"]
  ),
  spanish: culture(
    ["Alonso", "Antonio", "Cristobal", "Diego", "Fernando", "Francisco", "Gonzalo", "Hernando", "Juan", "Luis", "Miguel", "Rodrigo"],
    ["Ana", "Beatriz", "Catalina", "Elena", "Francisca", "Ines", "Isabel", "Juana", "Leonor", "Lucia", "Maria", "Teresa"],
    ["Alvarez", "de Acosta", "de la Vega", "de Soto", "Guzman", "Herrera", "Lopez", "Manrique", "Mendez", "Navarro", "Vazquez", "Velazquez"]
  ),
  portuguese: culture(
    ["Afonso", "Antonio", "Diogo", "Duarte", "Fernao", "Francisco", "Gaspar", "Joao", "Jorge", "Luis", "Nuno", "Pero"],
    ["Beatriz", "Brites", "Catarina", "Filipa", "Francisca", "Isabel", "Joana", "Leonor", "Margarida", "Maria", "Mecia", "Violante"],
    ["Barbosa", "da Costa", "da Cunha", "de Barros", "de Sousa", "Fernandes", "Gomes", "Lopes", "Martins", "Pereira", "Rodrigues", "Vasconcelos"]
  ),
  italian: culture(
    ["Alessandro", "Andrea", "Antonio", "Bartolomeo", "Bernardo", "Francesco", "Giovanni", "Lorenzo", "Marco", "Matteo", "Niccolo", "Pietro"],
    ["Alessandra", "Antonia", "Caterina", "Elisabetta", "Francesca", "Giovanna", "Isabella", "Lisa", "Lucia", "Maddalena", "Margherita", "Vittoria"],
    ["Barbieri", "Benedetti", "Contarini", "Doria", "Foscari", "Grimaldi", "Lombardi", "Medici", "Morosini", "Rossi", "Spinola", "Visconti"]
  ),
  germanic: culture(
    ["Albrecht", "Conrad", "Dietrich", "Friedrich", "Georg", "Hans", "Heinrich", "Hermann", "Johann", "Konrad", "Matthias", "Wilhelm"],
    ["Agnes", "Anna", "Barbara", "Brigitta", "Dorothea", "Elisabeth", "Gertrud", "Grete", "Katharina", "Magdalena", "Margarethe", "Ursula"],
    ["Bauer", "Becker", "Fischer", "Hoffmann", "Kaufmann", "Keller", "Kramer", "Muller", "Schmidt", "Schneider", "Wagner", "Weber"]
  ),
  nordic: culture(
    ["Anders", "Bjorn", "Erik", "Gustav", "Hans", "Iver", "Jens", "Karl", "Lars", "Nils", "Olav", "Soren"],
    ["Anna", "Birgitta", "Elin", "Else", "Ingeborg", "Karin", "Kirsten", "Margrete", "Maren", "Sigrid", "Sofie", "Tove"],
    ["Andersen", "Berg", "Eriksen", "Hansen", "Jorgensen", "Lind", "Nielsen", "Olsson", "Rasmussen", "Svensson", "Thomsen", "Vik"]
  ),
  slavic: culture(
    ["Aleksander", "Andrei", "Bogdan", "Dmitri", "Grigori", "Ivan", "Jan", "Kazimierz", "Mikhail", "Nikolai", "Pavel", "Stefan"],
    ["Agata", "Aleksandra", "Anna", "Barbara", "Elena", "Irina", "Jadwiga", "Katarzyna", "Maria", "Natalia", "Sofia", "Zofia"],
    ["Bielski", "Kowalski", "Mikhailov", "Nowak", "Orlov", "Petrov", "Romanov", "Sokolov", "Volkov", "Voronin", "Wisniewski", "Zielinski"]
  ),
  greek: culture(
    ["Alexios", "Andreas", "Demetrios", "Georgios", "Ioannis", "Konstantinos", "Manuel", "Markos", "Michael", "Nikolaos", "Petros", "Theodoros"],
    ["Anna", "Eirene", "Eleni", "Eudokia", "Kalliope", "Katerina", "Maria", "Sophia", "Theodora", "Varvara", "Xenia", "Zoe"],
    ["Doukas", "Kallergis", "Komnenos", "Laskaris", "Metaxas", "Palaiologos", "Rallis", "Sgouros", "Skleros", "Vlastos", "Xenos", "Zotos"]
  ),
  ottoman: culture(
    ["Ahmed", "Ali", "Bayezid", "Hasan", "Huseyin", "Kemal", "Mahmud", "Mehmed", "Murad", "Mustafa", "Osman", "Sinan"],
    ["Ayshe", "Fatma", "Gulbahar", "Hafsa", "Hatice", "Huma", "Kamer", "Mahidevran", "Mihrimah", "Nigar", "Selma", "Zeynep"],
    ["Aydinli", "Bosnali", "Celebi", "Edirneli", "Karamanli", "Pasha", "Reis", "Rumeli", "Saruhanli", "Sinoplu", "Tebrizi", "Yazici"]
  ),
  arabic: culture(
    ["Abdallah", "Ahmad", "Ali", "Hassan", "Ibrahim", "Ismail", "Khalil", "Mahmud", "Muhammad", "Salim", "Umar", "Yusuf"],
    ["Aisha", "Amina", "Fatima", "Hafsa", "Khadija", "Layla", "Maryam", "Nafisa", "Ruqayya", "Salma", "Safiya", "Zaynab"],
    ["al-Basri", "al-Dimashqi", "al-Fasi", "al-Halabi", "al-Hijazi", "al-Iskandari", "al-Masri", "al-Qahiri", "al-Qudsi", "al-Tunisi", "al-Yamani", "ibn Rashid"]
  ),
  persian: culture(
    ["Abbas", "Ali", "Bahram", "Farhad", "Hasan", "Husayn", "Ismail", "Jamal", "Kamran", "Mirza", "Reza", "Yusuf"],
    ["Afsaneh", "Banu", "Dilara", "Fatemeh", "Gohar", "Jahan", "Khadija", "Mahin", "Pari", "Roxana", "Shirin", "Zahra"],
    ["Ardabili", "Esfahani", "Gilani", "Kashani", "Kermani", "Mashhadi", "Qazvini", "Shirazi", "Tabrizi", "Tehrani", "Yazdi", "Zanjani"]
  ),
  southAsian: culture(
    ["Ananda", "Arjun", "Bhaskar", "Devraj", "Govinda", "Hari", "Kabir", "Krishna", "Madhava", "Raman", "Surya", "Vijay"],
    ["Asha", "Devi", "Gauri", "Indira", "Jaya", "Kamala", "Lakshmi", "Maya", "Padma", "Rani", "Sita", "Tara"],
    ["Bhat", "Chandra", "Das", "Deva", "Gupta", "Khan", "Naik", "Patel", "Rao", "Sen", "Shah", "Varma"]
  ),
  southeastAsian: culture(
    ["Ananda", "Bima", "Dara", "Jaya", "Kiet", "Minh", "Narai", "Raden", "Sokha", "Suriya", "Thanh", "Wira"],
    ["Ayu", "Bunga", "Dewi", "Indah", "Kanya", "Lan", "Mali", "Ratna", "Sari", "Sokha", "Suda", "Thuy"],
    ["Angkasa", "Chandra", "Jayavarman", "Kiet", "Nguyen", "Prasetya", "Rattanakosin", "Sok", "Sudirman", "Surya", "Tran", "Wirawan"]
  ),
  polynesian: culture(
    ["Aho'eitu", "Kau'ulufonua", "Mau", "Pili", "Puni", "Savea", "Tamatoa", "Tanoa", "Tupaia", "Tupou", "Tu", "Vaea"],
    ["Hina", "Kihawahine", "Lupepau'u", "Nafanua", "Pele", "Purea", "Salamasina", "Sina", "Teura", "Teri'i", "Vahine", "Veiqia"],
    ["Ha'apai", "Malietoa", "Nayau", "Roko Tui", "Sa Tupua", "Tamatoa", "Teva", "Tu'i Tonga", "Tui Viti", "Tupou", "Vunivalu", "Viti"]
  ),
  chinese: culture(
    ["Bao", "Cheng", "De", "Guang", "Hong", "Jian", "Ming", "Ping", "Sheng", "Wei", "Wen", "Yong"],
    ["Chun", "Fang", "Hua", "Lan", "Lian", "Mei", "Ning", "Qiao", "Xia", "Xiu", "Yan", "Ying"],
    ["Chen", "Huang", "Li", "Lin", "Liu", "Sun", "Wang", "Wu", "Xu", "Yang", "Zhang", "Zhao"],
    "family-first"
  ),
  japanese: culture(
    ["Akira", "Harunobu", "Hideaki", "Katsuro", "Masaru", "Noboru", "Saburo", "Shiro", "Taro", "Toshio", "Yoshiro", "Yukimura"],
    ["Aiko", "Chiyo", "Hana", "Haruko", "Kiku", "Matsu", "Nene", "Oichi", "Rin", "Saki", "Tama", "Yuki"],
    ["Abe", "Fujiwara", "Hojo", "Mori", "Oda", "Saito", "Shimazu", "Takeda", "Tokugawa", "Uesugi", "Yamamoto", "Yoshida"],
    "family-first"
  ),
  korean: culture(
    ["Dong", "Gyeom", "Hwan", "Jin", "Jun", "Min", "Seong", "Sik", "Su", "Tae", "Won", "Yeong"],
    ["Eun", "Hwa", "Hye", "Ji", "Mi", "Ok", "Seon", "Suk", "Sun", "Yeon", "Yeong", "Yun"],
    ["An", "Choe", "Gang", "Han", "Hong", "Im", "Jeong", "Jo", "Kim", "Lee", "Pak", "Yun"],
    "family-first"
  ),
  westAfrican: culture(
    ["Abdou", "Amadou", "Bakari", "Boubacar", "Daouda", "Ibrahim", "Kofi", "Mamadou", "Mansa", "Oumar", "Sekou", "Yoro"],
    ["Aissatou", "Aminata", "Awa", "Binta", "Fatou", "Hawa", "Kadi", "Mariama", "Nana", "Nene", "Sira", "Yacine"],
    ["Cisse", "Coulibaly", "Diarra", "Jallow", "Kamara", "Keita", "Kone", "Sissoko", "Soumare", "Toure", "Traore", "Wague"]
  ),
  eastAfrican: culture(
    ["Abebe", "Baraka", "Dawit", "Faraji", "Gebre", "Hassan", "Juma", "Khalfan", "Makonnen", "Musa", "Said", "Yohannes"],
    ["Aisha", "Almaz", "Aster", "Fatuma", "Hana", "Jamila", "Lulit", "Mariam", "Nuru", "Rahma", "Selam", "Zahra"],
    ["Abdalla", "Bekele", "Girma", "Kassa", "Kebede", "Mwinyi", "Negash", "Otieno", "Sahle", "Tesfaye", "Wolde", "Yared"]
  ),
  nahua: culture(
    ["Acolmiztli", "Cipac", "Cuauhtli", "Ixtlil", "Matlal", "Mazatl", "Tenoch", "Tizoc", "Tochtli", "Xicotencatl", "Yaotl", "Zolin"],
    ["Atotoztli", "Chalchi", "Citlali", "Izel", "Malinali", "Miahuaxihuitl", "Tecuelhuetzin", "Tlacoehua", "Xilonen", "Xochitl", "Yaretzi", "Zyanya"],
    ["Acolhua", "Chalca", "Huexotzinca", "Mexica", "Mixteca", "Tepaneca", "Texcocan", "Tlaxcalteca", "Tolteca", "Totonaca", "Xochimilca", "Zapoteca"]
  ),
  andean: culture(
    ["Amaru", "Apu", "Atoc", "Cusi", "Huaman", "Illapa", "Maita", "Pachacuti", "Rumi", "Tupaq", "Uturunku", "Yupanqui"],
    ["Coya", "Cusi", "Illari", "Killa", "Mama Ocllo", "Mayu", "Nusta", "Qori", "Sisa", "Sumac", "Urpi", "Wara"],
    ["Anta", "Chanka", "Chimpu", "Condor", "Hanan", "Inka", "Qhapaq", "Quispe", "Rimachi", "Uchu", "Vilca", "Yupanqui"]
  ),
  maritime: culture(
    ["Adrian", "Bastian", "Caspar", "Daniel", "Elias", "Felix", "Gabriel", "Hector", "Julian", "Lucas", "Martin", "Victor"],
    ["Adriana", "Beatrice", "Clara", "Diana", "Elena", "Flora", "Helena", "Lucia", "Marina", "Rosa", "Sabina", "Valeria"],
    ["Bell", "Drake", "Ferro", "Gale", "Harbor", "Marin", "North", "Quill", "Rivers", "Sable", "Storm", "Vale"]
  )
});

const COUNTRY_CULTURES = new Map([
  ["France", "french"], ["Spain", "spanish"], ["Portugal", "portuguese"],
  ["Italy", "italian"], ["Austria", "germanic"], ["Belgium", "germanic"],
  ["Germany", "germanic"], ["Netherlands", "germanic"], ["Denmark", "nordic"],
  ["Norway", "nordic"], ["Sweden", "nordic"], ["Iceland", "nordic"], ["Poland", "slavic"],
  ["Lithuania", "slavic"], ["Russian Federation", "slavic"], ["Ukraine", "slavic"],
  ["Hungary", "slavic"], ["Albania", "slavic"], ["Bulgaria", "slavic"],
  ["Romania", "slavic"], ["Serbia", "slavic"], ["Greece", "greek"],
  ["Cyprus", "greek"], ["Ireland", "english"], ["Turkey", "ottoman"],
  ["Egypt", "arabic"], ["Iraq", "arabic"], ["Lebanon", "arabic"],
  ["Israel", "arabic"], ["Morocco", "arabic"], ["Algeria", "arabic"],
  ["Libya", "arabic"], ["Tunisia", "arabic"], ["Oman", "arabic"],
  ["Saudi Arabia", "arabic"], ["Syrian Arab Republic", "arabic"], ["Yemen", "arabic"],
  ["Iran", "persian"], ["India", "southAsian"], ["Pakistan", "southAsian"],
  ["Nepal", "southAsian"], ["Sri Lanka", "southAsian"], ["Bangladesh", "southAsian"],
  ["Thailand", "southeastAsian"], ["Myanmar", "southeastAsian"],
  ["Vietnam", "southeastAsian"], ["Cambodia", "southeastAsian"],
  ["Indonesia", "southeastAsian"], ["Malaysia", "southeastAsian"],
  ["Brunei", "southeastAsian"], ["Lao People's Democratic Republic", "southeastAsian"],
  ["Philippines", "southeastAsian"],
  ["Aotearoa", "polynesian"], ["Cook Islands", "polynesian"],
  ["Fiji", "polynesian"], ["French Polynesia", "polynesian"],
  ["Hawaii", "polynesian"], ["Kiribati", "polynesian"],
  ["Niue", "polynesian"], ["Rapa Nui", "polynesian"],
  ["Samoa", "polynesian"], ["Tonga", "polynesian"],
  ["China", "chinese"], ["Japan", "japanese"],
  ["Republic of Korea", "korean"], ["Dem. People's Republic of Korea", "korean"],
  ["Mali", "westAfrican"], ["Ghana", "westAfrican"], ["Nigeria", "westAfrican"],
  ["Senegal", "westAfrican"], ["Ethiopia", "eastAfrican"], ["Kenya", "eastAfrican"],
  ["Mozambique", "eastAfrican"], ["Tanzania", "eastAfrican"], ["Somalia", "eastAfrican"], ["Mexico", "nahua"],
  ["Guatemala", "nahua"], ["Peru", "andean"], ["Bolivia", "andean"],
  ["Ecuador", "andean"], ["Columbia", "andean"], ["Cuba", "spanish"],
  ["Dominican Republic", "spanish"], ["Panama", "spanish"], ["Puerto Rico", "spanish"]
]);

const FACTION_CULTURES = new Map([
  ["england", "english"],
  ["scotland", "scottish"],
  ["france", "french"],
  ["spain", "spanish"],
  ["portugal", "portuguese"],
  ["habsburg", "germanic"],
  ["hungary", "slavic"],
  ["ottoman", "ottoman"],
  ["venice", "italian"],
  ["genoa", "italian"],
  ["papal-states", "italian"],
  ["ming", "chinese"],
  ["aztec", "nahua"],
  ["inca", "andean"],
  ["safavid", "persian"],
  ["muscovy", "slavic"],
  ["poland-lithuania", "slavic"],
  ["denmark-norway", "nordic"],
  ["songhai", "westAfrican"],
  ["morocco", "arabic"],
  ["ethiopia", "eastAfrican"],
  ["vijayanagara", "southAsian"],
  ["gujarat", "southAsian"],
  ["bengal", "southAsian"],
  ["delhi", "southAsian"],
  ["ayutthaya", "southeastAsian"],
  ["japan", "japanese"],
  ["joseon", "korean"]
]);

export function assignRegionalCharacterName({ identityKey, city, ship, sex, usedNames }) {
  if (typeof identityKey !== "string" || identityKey === "") throw new Error("Character name requires an identity key");
  if (!(usedNames instanceof Set)) throw new Error("Character name assignment requires a shared used-name Set");
  if (sex !== "female" && sex !== "male") throw new Error(`Character name requires an explicit sex: ${sex}`);
  const subject = city || shipPort(ship);
  const cultureId = chooseNameCultureForSubject(subject, identityKey);
  const nameCulture = CULTURES[cultureId];
  if (!nameCulture) throw new Error(`Unknown character name culture: ${cultureId}`);
  const gender = sex;
  const givenNames = gender === "female" ? nameCulture.female : nameCulture.male;
  const capacity = givenNames.length * nameCulture.family.length;
  const startIndex = hashString32(`${identityKey}|${cultureId}|${gender}|name`) % capacity;

  for (let attempt = 0; attempt < capacity; attempt++) {
    const index = (startIndex + attempt) % capacity;
    const givenName = givenNames[index % givenNames.length];
    const familyName = nameCulture.family[Math.floor(index / givenNames.length) % nameCulture.family.length];
    const name = nameCulture.order === "family-first"
      ? `${familyName} ${givenName}`
      : `${givenName} ${familyName}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    return { name, givenName, familyName, gender, nameCulture: cultureId };
  }
  throw new Error(`Exhausted ${gender} names for ${cultureId}`);
}

export function nameCultureForSubject(subject) {
  return nameCultureCandidatesForSubject(subject)[0];
}

export function nameCultureCandidatesForSubject(subject) {
  if (!subject || typeof subject !== "object") throw new Error("Character name requires a city or home port");
  const localCulture = localNameCultureForSubject(subject);
  const candidates = [localCulture];
  const factionCulture = FACTION_CULTURES.get(subject.factionId);
  if (factionCulture && factionCulture !== localCulture) candidates.push(factionCulture);
  return Object.freeze(candidates);
}

function chooseNameCultureForSubject(subject, identityKey) {
  const candidates = nameCultureCandidatesForSubject(subject);
  const weighted = candidates.length === 1 ? candidates : [candidates[0], candidates[0], candidates[0], candidates[1]];
  return weighted[hashString32(`${identityKey}|name-culture`) % weighted.length];
}

function localNameCultureForSubject(subject) {
  if (subject.country === "United Kingdom") {
    return subject.factionId === "scotland" || normalizeName(subject.city) === "edinburgh" ? "scottish" : "english";
  }
  const countryCulture = COUNTRY_CULTURES.get(subject.country);
  if (countryCulture) return countryCulture;
  if (subject.cityType === "east-asian") return "chinese";
  if (subject.cityType === "south-asian") return "southAsian";
  if (subject.cityType === "southeast-asian") return "southeastAsian";
  if (subject.cityType === "polynesian") return "polynesian";
  if (subject.cityType === "sub-saharan") return subject.lon >= 25 ? "eastAfrican" : "westAfrican";
  if (subject.cityType === "islamic-desert") return "arabic";
  if (subject.cityType === "mesoamerican" || subject.cityType === "meso-american") return "nahua";
  if (subject.cityType === "andean") return "andean";
  if (subject.cityType === "northern-european") return "germanic";
  if (subject.cityType === "mediterranean") return "italian";
  if (Number.isFinite(subject.lon) && subject.lon < -25) return subject.lat < 5 ? "andean" : "nahua";
  return "maritime";
}

function shipPort(ship) {
  const port = ship?.currentPort || ship?.plan?.origin;
  if (!port) throw new Error(`NPC ship ${ship?.id || "unknown"} has no home port for name assignment`);
  return port;
}

function culture(male, female, family, order = "given-first") {
  if (male.length === 0 || female.length === 0 || family.length === 0) throw new Error("Name culture pools cannot be empty");
  return Object.freeze({
    male: Object.freeze(male),
    female: Object.freeze(female),
    family: Object.freeze(family),
    order
  });
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
