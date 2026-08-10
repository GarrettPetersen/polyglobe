import { inferCharacterReligion, religionById } from "./characterReligion.js";
import { registerCharacterProperName } from "./properNounLocalization.js";

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
  icelandic: culture(
    ["Arni", "Bjarni", "Einar", "Eirik", "Gisli", "Gudmund", "Hallur", "Jon", "Olaf", "Snorri", "Stefan", "Thorstein"],
    ["Anna", "Astrid", "Gudrun", "Hallbera", "Helga", "Ingibjorg", "Kristin", "Margret", "Ragnheidur", "Sigrid", "Thora", "Valgerd"],
    ["Arna", "Bjarna", "Einars", "Eiriks", "Gisla", "Gudmundar", "Halls", "Jons", "Olafs", "Snorra", "Stefans", "Thorsteins"],
    "given-first",
    "icelandic-patronymic"
  ),
  slavic: culture(
    ["Aleksander", "Andrei", "Bogdan", "Dmitri", "Grigori", "Ivan", "Jan", "Kazimierz", "Mikhail", "Nikolai", "Pavel", "Stefan"],
    ["Agata", "Aleksandra", "Anna", "Barbara", "Elena", "Irina", "Jadwiga", "Katarzyna", "Maria", "Natalia", "Sofia", "Zofia"],
    ["Bielski", "Kowalski", "Mikhailov", "Nowak", "Orlov", "Petrov", "Romanov", "Sokolov", "Volkov", "Voronin", "Wisniewski", "Zielinski"],
    "given-first",
    "slavic-adjectival"
  ),
  polish: culture(
    ["Andrzej", "Jan", "Jakub", "Kazimierz", "Krzysztof", "Maciej", "Marcin", "Mikolaj", "Pawel", "Piotr", "Stanislaw", "Wojciech"],
    ["Agnieszka", "Anna", "Barbara", "Dorota", "Elzbieta", "Helena", "Jadwiga", "Katarzyna", "Malgorzata", "Regina", "Urszula", "Zofia"],
    ["Bielski", "Dabrowski", "Kaminski", "Kowalski", "Mazur", "Nowak", "Szymanski", "Wisniewski", "Wojcik", "Wroblewski", "Zalewski", "Zielinski"],
    "given-first",
    "polish-adjectival"
  ),
  lithuanian: culture(
    ["Albertas", "Andrius", "Augustinas", "Baltramiejus", "Benediktas", "Jokubas", "Jonas", "Jurgis", "Kazimieras", "Martynas", "Mikalojus", "Stanislovas"],
    ["Agota", "Barbora", "Birute", "Domicela", "Elzbieta", "Jadvyga", "Kotryna", "Marija", "Morta", "Ona", "Radvile", "Sofija"],
    ["Astikas", "Butrimas", "Daukantas", "Gedgaudas", "Giedraitis", "Gostautas", "Kezgaila", "Mantvydas", "Narbutas", "Radvila", "Sapega", "Vainius"]
  ),
  russian: culture(
    ["Aleksei", "Andrei", "Boris", "Dmitri", "Fyodor", "Grigori", "Ivan", "Mikhail", "Nikolai", "Semyon", "Vasili", "Yuri"],
    ["Anastasia", "Anna", "Daria", "Elena", "Evdokia", "Feodora", "Irina", "Ksenia", "Maria", "Natalia", "Olga", "Sofia"],
    ["Alekseev", "Borisov", "Fedorov", "Ivanov", "Mikhailov", "Morozov", "Orlov", "Petrov", "Romanov", "Sokolov", "Vasiliev", "Volkov"],
    "given-first",
    "east-slavic-adjectival"
  ),
  ruthenian: culture(
    ["Andrii", "Bohdan", "Danylo", "Fedko", "Hryhorii", "Ivan", "Levko", "Mykhailo", "Ostap", "Petro", "Semen", "Vasyl"],
    ["Anna", "Hanna", "Iryna", "Kateryna", "Khrystyna", "Marfa", "Maria", "Nadiia", "Olena", "Paraska", "Solomiia", "Tetiana"],
    ["Andrusko", "Bohdanovych", "Danilovych", "Hryhorovych", "Ivashko", "Khmara", "Koval", "Levchenko", "Petrenko", "Romanovych", "Vasylenko", "Zubko"]
  ),
  hungarian: culture(
    ["Andras", "Balint", "Ferenc", "Gaspar", "Gyorgy", "Istvan", "Janos", "Laszlo", "Matyas", "Miklos", "Pal", "Tamas"],
    ["Anna", "Borbala", "Dorottya", "Erzsebet", "Ilona", "Judit", "Katalin", "Klara", "Margit", "Orsolya", "Rebeka", "Zsuzsanna"],
    ["Balassi", "Bathory", "Bocskai", "Csaky", "Esterhazy", "Forgach", "Hunyadi", "Kinizsi", "Nadasdy", "Rakoczi", "Szapolyai", "Zrinyi"],
    "family-first"
  ),
  albanian: culture(
    ["Aleks", "Andrea", "Dhimiter", "Gjin", "Gjon", "Kole", "Leke", "Mark", "Nikolle", "Pal", "Pjeter", "Progon"],
    ["Ana", "Angjelina", "Donika", "Jelena", "Katarina", "Komnena", "Lucia", "Mara", "Maria", "Teodora", "Vojsava", "Zana"],
    ["Arianiti", "Bua", "Dukagjini", "Gropa", "Kastrioti", "Muzaka", "Shpata", "Spani", "Thopia", "Topia", "Zaharia", "Zenebishi"]
  ),
  bulgarian: culture(
    ["Bogdan", "Dimitar", "Dragomir", "Georgi", "Ivan", "Nikola", "Petar", "Radoslav", "Stefan", "Stoyan", "Todor", "Vasil"],
    ["Anna", "Desislava", "Elena", "Irina", "Kalina", "Katerina", "Maria", "Milena", "Nadezhda", "Rada", "Teodora", "Yana"],
    ["Bogdanov", "Dimitrov", "Georgiev", "Ivanov", "Nikolov", "Petrov", "Radev", "Stoyanov", "Todorov", "Vasilev", "Vladislavov", "Zlatev"],
    "given-first",
    "east-slavic-adjectival"
  ),
  romanian: culture(
    ["Alexandru", "Andrei", "Bogdan", "Dan", "Dragos", "Ion", "Mihail", "Mircea", "Nicolae", "Petru", "Radu", "Stefan"],
    ["Ana", "Anca", "Caterina", "Elena", "Ilinca", "Irina", "Maria", "Marina", "Ruxandra", "Stanca", "Teodora", "Voica"],
    ["Albu", "Basarab", "Brancoveanu", "Craiovescu", "Danescu", "Dragomir", "Florescu", "Ionescu", "Movila", "Popescu", "Rosetti", "Vladislav"]
  ),
  serbian: culture(
    ["Bogdan", "Djordje", "Jovan", "Lazar", "Marko", "Mihailo", "Nikola", "Pavle", "Petar", "Radovan", "Stefan", "Vuk"],
    ["Ana", "Danica", "Dragana", "Jelena", "Katarina", "Mara", "Marija", "Milica", "Rada", "Sofija", "Teodora", "Vukosava"],
    ["Bogdanovic", "Djuric", "Jovanovic", "Lazarevic", "Markovic", "Nikolic", "Pavlovic", "Petrovic", "Popovic", "Radovic", "Stefanovic", "Vukovic"]
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
    ["Abbas", "Ali", "Bahram", "Farhad", "Hasan", "Husayn", "Ismail", "Jamal", "Kamran", "Muhammad", "Tahmasp", "Yusuf"],
    ["Alamshah", "Banu", "Dilara", "Fatemeh", "Gohar", "Jahan", "Khadija", "Mahin", "Pari", "Shahbigi", "Shirin", "Zahra"],
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
    ["Dosan", "Harunobu", "Hideyoshi", "Hisahide", "Ieyasu", "Kenshin", "Motonari", "Nobunaga", "Shingen", "Takakage", "Yoshihiro", "Yukimura"],
    ["Chacha", "Go", "Hatsu", "Jukeini", "Kicho", "Matsu", "Nene", "Oichi", "Otsuya", "Sen", "Tama", "Tora"],
    ["Abe", "Fujiwara", "Hojo", "Mori", "Oda", "Saito", "Shimazu", "Takeda", "Tokugawa", "Uesugi", "Yamamoto", "Yoshida"],
    "family-first"
  ),
  ryukyuan: culture(
    ["Choken", "Choshin", "Kanemaru", "Kochi", "Seishun", "Seisho", "Shin", "Urasoe"],
    ["Manabe", "Mao", "Momoto", "Oto", "Umitukugani", "Urasoe", "Yona", "Yoshi"],
    ["Ba", "Gushikawa", "Kin", "Kume", "Mao", "Nago", "Sai", "Sho"],
    "family-first"
  ),
  ainu: culture(
    ["Cikap", "Hucire", "Ikatobefu", "Koshamain", "Onibishi", "Samkusaynu", "Shakushain", "Tosaranku"],
    ["Chikamaha", "Imekanu", "Kannari", "Monashinouku", "Peramonkoro", "Retar", "Sayo", "Tureshipa"],
    ["Akan", "Akkeshi", "Hidaka", "Ishikari", "Kushiro", "Nemuro", "Saru", "Tokachi"]
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
  irish: culture(
    ["Aodh", "Brian", "Cormac", "Diarmaid", "Domhnall", "Eoghan", "Gearoid", "Muiris", "Niall", "Piaras", "Ruaidhri", "Sean"],
    ["Aine", "Caitlin", "Dearbhail", "Eilis", "Fionnghuala", "Grainne", "Honora", "Maire", "Nuala", "Rose", "Sadhbh", "Siobhan"],
    ["Burke", "Butler", "FitzGerald", "MacCarthy", "MacDonnell", "O'Brien", "O'Donnell", "O'Neill", "O'Rourke", "O'Sullivan", "Plunkett", "Tyrrell"]
  ),
  czech: culture(
    ["Bohuslav", "Hynek", "Jan", "Jindrich", "Jiri", "Mikulash", "Oldrich", "Petr", "Vaclav", "Vilem", "Zbynek", "Zdenek"],
    ["Alzbeta", "Anna", "Barbora", "Dorota", "Johanka", "Katerina", "Kunhuta", "Lidmila", "Ludmila", "Marketa", "Perchta", "Zofie"],
    ["Berka", "Cernin", "Hassenstein", "Kostka", "Lobkowicz", "Pernstejn", "Podebrad", "Rozmberk", "Schlick", "Sternberk", "Trcka", "Zerotin"]
  ),
  finnish: culture(
    ["Antti", "Henrik", "Jaakko", "Klaus", "Lauri", "Martti", "Matti", "Mikael", "Olavi", "Paavo", "Pietari", "Tuomas"],
    ["Agneta", "Birgitta", "Elina", "Gertrud", "Kaarina", "Kerstin", "Kristina", "Margareta", "Marta", "Sigrid", "Valpuri", "Vappu"],
    ["Aminoff", "Fleming", "Horn", "Ille", "Jagerhorn", "Kurki", "Sarkilahti", "Stalarm", "Tavast", "Tott", "Villnass", "Wildeman"]
  ),
  crimeanTatar: culture(
    ["Ahmed", "Devlet", "Gazi", "Islam", "Mengli", "Mehmed", "Mubarek", "Murad", "Saadet", "Sahib", "Selim", "Yamgurchi"],
    ["Ayse", "Canike", "Emine", "Feride", "Gulbahar", "Hafsa", "Hanim", "Nur Sultan", "Safiye", "Selime", "Sultanbike", "Zeynep"],
    ["Argin", "Barin", "Giray", "Kipchak", "Mansur", "Shirin", "Sijivut", "Yashlav"]
  ),
  tatar: culture(
    ["Abd al-Latif", "Ghabdellatif", "Ilham", "Mahmud", "Muhammad Amin", "Safa Giray", "Shahghali", "Yadigar", "Yusuf"],
    ["Fatima", "Gawharshad", "Gulshah", "Nur Sultan", "Suyumbika", "Zahra"],
    ["Ar", "Barin", "Bolgar", "Kipchak", "Manghit", "Mishar", "Nogai"]
  ),
  centralAsian: culture(
    ["Abd al-Aziz", "Abdallah", "Babur", "Jani Beg", "Kuchkunji", "Mahmud", "Muhammad Yar", "Muhammad Shaybani", "Obaydallah", "Pir Muhammad", "Suyunch", "Ubayd"],
    ["Aisan Daulat", "Gulbadan", "Gulrukh", "Habiba", "Khanzada", "Kutlugh", "Maham", "Mihr Nigar", "Nigar", "Qutlugh Nigar", "Sultan Nigar", "Zuhra"],
    ["Barlas", "Dughlat", "Janibegid", "Kuchkunjid", "Manghit", "Qongirat", "Shaybanid", "Timurid", "Yuz"]
  ),
  indoMuslim: culture(
    ["Alauddin", "Bahlul", "Daulat", "Ghiyas", "Ibrahim", "Iskandar", "Jamal", "Mahmud", "Muhammad", "Nasir", "Sikandar", "Yusuf"],
    ["Amina", "Bibi", "Daulat", "Gulrukh", "Habiba", "Hamida", "Jahanara", "Khadija", "Mahduma", "Mariam", "Ruqayya", "Zaynab"],
    ["Ansari", "Bukhari", "Farooqi", "Khan", "Lodi", "Mirza", "Qureshi", "Sayyid", "Shaikh", "Sherwani", "Siddiqi", "Sur"]
  ),
  jewish: culture(
    ["Aaron", "Abraham", "Benjamin", "David", "Elijah", "Isaac", "Jacob", "Joseph", "Moses", "Raphael", "Samuel", "Solomon"],
    ["Abigail", "Deborah", "Esther", "Hannah", "Judith", "Leah", "Miriam", "Rachel", "Rebecca", "Sarah", "Tamar", "Zipporah"],
    ["Abravanel", "Alfandari", "Benveniste", "Capsali", "Caro", "Hamon", "ibn Yahya", "Nasi", "Navarro", "Pardo", "Saraf", "Sarfati"]
  ),
  sikh: culture(
    ["Angad", "Bala", "Bhai Mardana", "Buddha", "Lahina", "Nanak", "Prithi", "Rai Bular", "Sajjan"],
    ["Bebe Nanaki", "Daya", "Khivi", "Mata Mansa", "Rajni", "Sulakhni", "Tripta"],
    ["Bedi", "Bhalla", "Khatri", "Sodhi", "Trehan"]
  ),
  northIndian: culture(
    ["Ajit", "Amar", "Bhoj", "Chand", "Gopal", "Haridas", "Jagat", "Kalyan", "Pratap", "Ratan", "Suraj", "Vikram"],
    ["Durgavati", "Hansabai", "Heer", "Karnavati", "Karmavati", "Meera", "Padmavati", "Ratna", "Sahibdevi", "Tara", "Udai", "Vijaya"],
    ["Bundela", "Chauhan", "Gahlot", "Kachhwaha", "Paramara", "Rathore", "Sisodia", "Solanki", "Tomar"]
  ),
  gujarati: culture(
    ["Bhalan", "Bhimji", "Jagdu", "Jiva", "Kalyan", "Kheta", "Mandana", "Narsinh", "Shamal", "Soma", "Teja", "Vasta"],
    ["Ajab", "Amba", "Deval", "Gangabai", "Jivabai", "Kunwarbai", "Lalita", "Mena", "Ratanbai", "Rukmini", "Sonal", "Vijaya"],
    ["Bhat", "Desai", "Mehta", "Modi", "Nagar", "Parekh", "Patel", "Shah", "Soni", "Vora"]
  ),
  bengali: culture(
    ["Advaita", "Chaitanya", "Govinda", "Haridas", "Jagadananda", "Madhava", "Mukunda", "Nityananda", "Raghunath", "Ramananda", "Rupa", "Sanatana"],
    ["Bishnupriya", "Chandravati", "Damayanti", "Ganga", "Jahnava", "Lakshmi", "Malati", "Narayanidevi", "Sachi", "Sita", "Subhadra", "Vasudha"],
    ["Basu", "Chakrabarti", "Das", "Datta", "Ghosh", "Guha", "Mitra", "Mukherjee", "Pal", "Sen"]
  ),
  southIndian: culture(
    ["Achyuta", "Appaji", "Bukkaraya", "Devaraya", "Krishnadevaraya", "Narasimha", "Ramaraya", "Saluva", "Timmarusu", "Tirumala", "Venkata", "Virupaksha"],
    ["Chinnadevi", "Gangadevi", "Jaganmohini", "Kamaladevi", "Lakshmidevi", "Nagajamma", "Obambika", "Rangadevi", "Tirumalamba", "Tirumaladevi", "Varadambika", "Vengamamba"],
    ["Aravidu", "Hampi", "Keladi", "Nayaka", "Saluva", "Sangama", "Tuluva", "Vijayanagara"]
  ),
  malayali: culture(
    ["Achyuta", "Aditya", "Govindan", "Kesavan", "Kumaran", "Manavikrama", "Narayanan", "Rama", "Ravi", "Shankaran", "Unni", "Vira"],
    ["Amma", "Devaki", "Gauri", "Kalyani", "Kunjamma", "Lakshmi", "Nangeli", "Parvati", "Savitri", "Sridevi", "Unnima", "Vallabha"],
    ["Cochin", "Kolathiri", "Kottayam", "Kozhikode", "Nair", "Nambiar", "Nediyiruppu", "Palakkad", "Samoothiri", "Venad"]
  ),
  sinhalese: culture(
    ["Bhuvanekabahu", "Dharmapala", "Jayavira", "Parakramabahu", "Raigam", "Senasammata", "Sri Rajasinha", "Vijayabahu", "Vira", "Wickramabahu"],
    ["Anula", "Chandravati", "Kusumasana", "Lokamahadevi", "Samudra", "Sivali", "Somadevi", "Sunethra", "Viharamahadevi", "Yasodhara"],
    ["Alagakkonara", "Bandara", "Jayawardena", "Kotte", "Rajapaksa", "Senasammata", "Siriwardena", "Wijesinghe"]
  ),
  swahili: culture(
    ["Abdallah", "Ahmad", "Ali", "Bakari", "Hassan", "Ibrahim", "Juma", "Khalfan", "Muhammad", "Said", "Salim", "Yusuf"],
    ["Aisha", "Amina", "Fatima", "Halima", "Khadija", "Maimuna", "Mariam", "Mwajuma", "Rahma", "Saada", "Salma", "Zaynab"],
    ["al-Kilwi", "al-Malindi", "al-Mombasi", "al-Pembi", "al-Sufali", "al-Zanjibari", "Mvita", "Nabhani", "Shirazi"]
  ),
  somali: culture(
    ["Abadir", "Ahmad", "Ali", "Aw", "Hassan", "Ibrahim", "Mahfuz", "Muhammad", "Nur", "Umar", "Wali", "Yusuf"],
    ["Asha", "Faduma", "Halima", "Hawa", "Khadija", "Mariam", "Maryan", "Rahma", "Safiya", "Shukri", "Warsan", "Zahra"],
    ["Ajuran", "Darod", "Dir", "Hawiye", "Isaaq", "Marehan", "Muzaffar", "Warsangali"]
  ),
  ethiopian: culture(
    ["Amda", "Dawit", "Eskender", "Gelawdewos", "Lebna Dengel", "Makonnen", "Minas", "Naod", "Sarsa Dengel", "Takla", "Yaqob", "Zara"],
    ["Eleni", "Martha", "Masih", "Romna", "Sabla Wangel", "Seble", "Walatta", "Woizero", "Yodit", "Zewditu"],
    ["Amda", "Dawit", "Gebre", "Iyasu", "Makonnen", "Mikael", "Naod", "Takla", "Yaqob", "Yohannes", "Zara"]
  ),
  shona: culture(
    ["Changamire", "Chisamharu", "Chivere", "Kakuyo", "Matope", "Mavura", "Mukwati", "Mutota", "Nehoreka", "Nyatsimba", "Rusere", "Togwa"],
    ["Chipo", "Maita", "Maruva", "Masimba", "Mavambo", "Mudiwa", "Nyasha", "Rufaro", "Rudo", "Tariro", "Tendai", "Tsitsi"],
    ["Mbire", "Mutapa", "Rozvi", "Tavara", "Torwa", "Zezuru"]
  ),
  mande: culture(
    ["Abdou", "Amadou", "Bakari", "Daouda", "Ibrahim", "Mahmud", "Mamadou", "Muhammad", "Oumar", "Sekou", "Sonni", "Yoro"],
    ["Aissatou", "Aminata", "Awa", "Binta", "Fatou", "Hawa", "Kadi", "Mariama", "Nana", "Nene", "Sira", "Yacine"],
    ["Cisse", "Coulibaly", "Diarra", "Keita", "Kone", "Sissoko", "Soumare", "Toure", "Traore", "Wague"]
  ),
  yoruba: culture(
    ["Ajiboyede", "Ajaka", "Alafin", "Egunoju", "Kori", "Ofinran", "Onigbogi", "Oranyan", "Sango", "Tella", "Timi", "Wamiloju"],
    ["Abeni", "Abike", "Adetoun", "Aina", "Ajoke", "Efun", "Moremi", "Olu", "Orompoto", "Ronke", "Torosi", "Yejide"],
    ["Egba", "Ekiti", "Ife", "Ijebu", "Ijesha", "Owu", "Oyo"]
  ),
  hausa: culture(
    ["Abdullahi", "Abubakar", "Ali", "Bagauda", "Dauda", "Ibrahim", "Kisoki", "Muhammad", "Rumfa", "Sarki", "Umar", "Yakubu"],
    ["Amina", "Asabe", "Binta", "Dije", "Fadima", "Hadiza", "Hauwa", "Kande", "Ladi", "Maryam", "Rabi", "Zainab"],
    ["Daura", "Gobir", "Kano", "Katsina", "Kebbi", "Rano", "Zamfara", "Zazzau"]
  ),
  kanuri: culture(
    ["Ali Gaji", "Bir", "Dunama", "Idris", "Ibrahim", "Kaday", "Muhammad", "Njimi", "Salih", "Umar", "Yaqub"],
    ["Aisa", "Falmata", "Hajja", "Kaltumi", "Khadija", "Maimuna", "Maryam", "Ruqayya", "Zainab"],
    ["Borno", "Bulala", "Kanembu", "Kayi", "Magumi", "Sefuwa"]
  ),
  kongo: culture(
    ["Afonso", "Diogo", "Henrique", "Lukeni", "Mani", "Mpanzu", "Mvemba", "Nkuwu", "Nzinga", "Pedro"],
    ["Ana", "Isabel", "Lukeni", "Mpemba", "Nzinga", "Teresa"],
    ["Kanda", "Kinlaza", "Kimpanzu", "Kwilu", "Lukeni", "Mpanzu", "Nsaku", "Nzinga"]
  ),
  khoikhoi: culture(
    ["Autshumao", "Doman", "Gonnema", "Goreinghaicona", "Klaas", "Oedasoa", "Schacher", "Sousoa"],
    ["Krotoa", "Sara", "Hoena", "Kamies", "Nama", "Tsoa"],
    ["Chainouqua", "Chariguriqua", "Cochoqua", "Goringhaiqua", "Gorachouqua", "Namaqua"]
  ),
  malay: culture(
    ["Alauddin", "Hang Jebat", "Hang Kasturi", "Hang Lekir", "Hang Lekiu", "Hang Tuah", "Mahmud", "Mansur", "Muzaffar", "Parameswara", "Raja Ahmad", "Tun Perak"],
    ["Dang Anum", "Puteri Gunung Ledang", "Raja Fatimah", "Raja Puteh", "Tun Fatimah", "Tun Kudu", "Tun Teja"],
    ["Bendahara", "Brunei", "Johor", "Kedah", "Kelantan", "Melaka", "Pahang", "Patani", "Perak"]
  ),
  javanese: culture(
    ["Arya", "Fatahillah", "Pati Unus", "Prawata", "Raden Patah", "Sunan Giri", "Sunan Kalijaga", "Trenggana", "Wirabhumi"],
    ["Dewi Kandita", "Nyi Ageng", "Ratu Kalinyamat", "Retna Kencana", "Retno", "Sekar", "Wandan"],
    ["Demak", "Giri", "Gresik", "Jepara", "Majapahit", "Pajang", "Tuban"]
  ),
  malukan: culture(
    ["Abu Hayat", "Bayan Sirrullah", "Boleife", "Hairun", "Jamilu", "Kaicil", "Mansur", "Mir", "Sahmardan", "Taruwese", "Zainal Abidin"],
    ["Boki Raja", "Boki Tanjung", "Gia", "Nita", "Nukila", "Siti", "Zainab"],
    ["Bacan", "Banda", "Buru", "Gane", "Hitu", "Jailolo", "Makian", "Ternate", "Tidore"]
  ),
  cebuano: culture(
    ["Awi", "Colambu", "Humabon", "Lapulapu", "Siaui", "Siagu", "Tupas", "Zula"],
    ["Abuwana", "Humamay", "Juana", "Lalana", "Saray", "Ylang"],
    ["Butuan", "Cebu", "Limasawa", "Mactan", "Sugbu"]
  ),
  thai: culture(
    ["Borommaracha", "Chairacha", "Chai", "Intharacha", "Mahachakraphat", "Ramathibodi", "Ramesuan", "Songtham", "Thianracha"],
    ["Boromdilok", "Si Sudachan", "Sukhon", "Suriyothai", "Yot Kham Thip"],
    ["Ayutthaya", "Lavo", "Phitsanulok", "Sukhothai", "Suphanburi", "U-Thong"]
  ),
  monBurmese: culture(
    ["Bayinnaung", "Binnya Ran", "Dhammazedi", "Minbin", "Minkhaung", "Minye Kyawswa", "Tabinshwehti", "Takayutpi", "Thado"],
    ["Dhamma Dewi", "Mibaya", "Narapati Medaw", "Shin Bo-Me", "Shin Mi-Nauk", "Shin Myat Hla", "Shin Sawbu"],
    ["Ava", "Hanthawaddy", "Mrauk-U", "Pegu", "Prome", "Taungoo"]
  ),
  vietnamese: culture(
    ["Cong Uan", "Dang Dung", "Dang Doanh", "Dinh Le", "Le Loi", "Le Sat", "Mac Dang Dung", "Nguyen Trai", "Trinh Kha"],
    ["Huyen Tran", "Ngoc Han", "Ngoc Kieu", "Nguyen Thi Anh", "Trinh Thi Ngoc"],
    ["Bui", "Dinh", "Le", "Ly", "Mac", "Nguyen", "Pham", "Tran", "Trinh"],
    "family-first"
  ),
  cham: culture(
    ["Ban La Tra Toan", "Bo Tri Tri", "Che Bong Nga", "Che Man", "Che Nang", "Jaya Indravarman", "Maha Sajan", "Maha Vijaya", "Po Binasuor", "Tra Hoa Bo De"],
    ["Bia At", "Bia Nai", "Bia Than Can", "Bia Than Cih", "Daravati", "Paramesvari", "Tapasi"],
    ["Amaravati", "Indrapura", "Kauthara", "Panduranga", "Vijaya"]
  ),
  lao: culture(
    ["Chakkaphat", "La Sen Thai", "Photisarath", "Samsenethai", "Setthathirath", "Visoun"],
    ["Keo Phimpha", "Kham Khong", "Nang Keo", "Nang Kham", "Yot Kham Thip"],
    ["Champasak", "Lan Xang", "Luang Prabang", "Vientiane"]
  ),
  // Personal names use documented transliterations. The final pool represents
  // house, clan, nation, or community identity rather than European surnames.
  northwestCoast: culture(
    ["Callicum", "Haatse", "It-an-da-ha", "Kal-chote", "Keh-chook", "Maquinna", "Tah-a-howtl", "Tatoosh", "Tlehasim", "Tsah-tse-in", "Tse-kauwtl", "Wickaninnish"],
    ["Aammiitlaawaksa", "Hitaao", "Naaskuusatl", "Thlaquas", "Tlehtskwiisimka"],
    ["Ahousaht", "Bahaada", "Deah", "Hesquiaht", "Hoko", "Kyuquot", "Makah", "Mowachaht", "Nuchatlaht", "Ozette", "Tseshaht", "Waatch"]
  ),
  wendat: culture(
    ["Aenon", "Ahatsistari", "Annenraes", "Atironta", "Chihwatenhwa", "Hechon", "Kondiaronk", "Ochasteguin", "Otsinonannhont", "Sastaretsi", "Taretande", "Tehorenhaegnon"],
    ["Andehoua", "Aonetta", "Aorhenche", "Awirinda", "Lawinonkie", "Ondinnonk"],
    ["Arendarhonon", "Ataronchronon", "Attigneenongnahac", "Attignawantan", "Bear", "Cord", "Deer", "Rock", "Tahontaenrat", "Tionontati", "Turtle", "Wendake"]
  ),
  shawnee: culture(
    ["Catahecassa", "Cheeseekau", "Hokoleskwa", "Kishkalwa", "Lawachcamicky", "Misemeathaquatha", "Pucksinwah", "Tamenebuck", "Tecumseh", "Tenskwatawa", "Weyapiersenwah", "Wopatha"],
    ["Kakowatcheky", "Methoataske", "Nonhelema", "Tecumapese", "Wea", "Wihcakwaya"],
    ["Chillicothe", "Deer", "Hathawekela", "Kispoko", "Mekoche", "Panther", "Pekowi", "Raccoon", "Snake", "Turkey", "Turtle", "Wolf"]
  ),
  taino: culture(
    ["Agueybana", "Aymaco", "Bohechio", "Caguax", "Caonabo", "Guacanagari", "Guama", "Guarionex", "Guarocuya", "Hatuey", "Humacao", "Orocobix"],
    ["Anacaona", "Ata", "Ataguas", "Buriquena", "Caguama", "Canaca", "Higuenamota", "Yuisa"],
    ["Bainoa", "Boriken", "Guanahani", "Higuey", "Jaragua", "Maguana", "Magua", "Marien", "Mayaguana", "Saona", "Xaragua", "Yumay"]
  ),
  tupi: culture(
    ["Aimbere", "Arariboia", "Cunhambebe", "Guaixa", "Pindobucu", "Piragibe", "Taparica", "Tibirica"],
    ["Bartira", "Guaibimpara", "Paraguacu", "Potira", "Terebe", "Ybotyra"],
    ["Caete", "Carijo", "Goitaca", "Potiguara", "Tabajara", "Tamoio", "Temimino", "Tremembe", "Tupinae", "Tupinamba", "Tupinikin", "Tupiniquim"]
  ),
  maya: culture(
    ["Ah Kin Chel", "Ah Pula", "Aj Canul", "Ajpop Balam", "Beleheb Tzi", "Can Ek", "Kiqab", "Moch Couoh", "Nachan Can", "Nachi Cocom", "Oxib Keh", "Tecun Uman"],
    ["Ix Ajaw", "Ix Balam", "Ix Ch'el", "Ix Hun K'ay", "Ix Kabal Xook", "Ix Kan", "Ix Naah Ek", "Ix Tzakbu", "Ix Wak Chan", "Ix Yohl Kinich", "Sak Kuk", "Yohl Iknal"],
    ["Canul", "Chel", "Chontal", "Cocom", "Cupul", "Itza", "Kaqchikel", "Kejache", "Kiche", "Kowoj", "Pech", "Xiu"]
  ),
  purepecha: culture(
    ["Curatame", "Hiquingaje", "Hiripan", "Nanuma", "Tariacuri", "Tangaxoan", "Tzitzispandacuare", "Tzinzincha", "Vapeani", "Zizambanacha", "Zuangua", "Zuiripancuare"],
    ["Atzimba", "Erendira", "Huanita", "Ireri", "Mintzita", "Parakata", "Tsitsiki", "Zizita"],
    ["Cuitzeo", "Ihuatzio", "Jaracuaro", "Patzcuaro", "Tariacuri", "Tzintzuntzan", "Uacusecha", "Uanacaze", "Vayameo", "Zacapu", "Zirahuen", "Ziranzirancamaro"]
  ),
  nahua: culture(
    ["Acolmiztli", "Cipac", "Cuauhtli", "Ixtlil", "Matlal", "Mazatl", "Tenoch", "Tizoc", "Tochtli", "Xicotencatl", "Yaotl", "Zolin"],
    ["Atotoztli", "Chalchi", "Citlali", "Izel", "Malinali", "Miahuaxihuitl", "Papantzin", "Tecuelhuetzin", "Tecuichpotzin", "Tlacoehua", "Xilonen", "Xochitl"],
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
  ["Norway", "nordic"], ["Sweden", "nordic"], ["Iceland", "icelandic"], ["Poland", "polish"],
  ["Lithuania", "lithuanian"], ["Russian Federation", "russian"], ["Ukraine", "ruthenian"],
  ["Hungary", "hungarian"], ["Albania", "albanian"], ["Bulgaria", "bulgarian"],
  ["Romania", "romanian"], ["Serbia", "serbian"], ["Greece", "greek"],
  ["Cyprus", "greek"], ["Ireland", "irish"], ["Finland", "finnish"], ["Turkey", "ottoman"],
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
  ["Guatemala", "maya"], ["Nuu-chah-nulth", "northwestCoast"], ["Makah", "northwestCoast"],
  ["Peru", "andean"], ["Bolivia", "andean"],
  ["Ecuador", "andean"], ["Columbia", "andean"], ["Cuba", "spanish"],
  ["Dominican Republic", "spanish"], ["Panama", "spanish"], ["Puerto Rico", "spanish"],
  ["Malta", "italian"], ["Croatia", "slavic"], ["Cape Verde", "portuguese"],
  ["Sao Tome and Principe", "portuguese"], ["Maldives", "southAsian"]
]);

const CITY_CULTURES = new Map([
  ["prague", "czech"],
  ["riga", "germanic"],
  ["bakhchiserai", "crimeanTatar"],
  ["feodosia", "crimeanTatar"],
  ["sudak", "crimeanTatar"],
  ["kazan", "tatar"],
  ["samarkand", "centralAsian"],
  ["bukhara", "centralAsian"],
  ["kabul", "centralAsian"],
  ["kashi", "centralAsian"],
  ["tsinkiang", "centralAsian"],
  ["turpan", "centralAsian"],
  ["herat", "persian"],
  ["kilwa", "swahili"],
  ["mombasa", "swahili"],
  ["sofala", "swahili"],
  ["mozambique", "swahili"],
  ["mogadishu", "somali"],
  ["massawa", "ethiopian"],
  ["axum", "ethiopian"],
  ["zimbabwe", "shona"],
  ["gao", "mande"],
  ["mali", "mande"],
  ["tombouctou", "mande"],
  ["dienne", "mande"],
  ["ikoso", "mande"],
  ["oyo", "yoruba"],
  ["kano", "hausa"],
  ["alkalawa", "hausa"],
  ["nkazargamu", "kanuri"],
  ["m'banza-congo", "kongo"],
  ["mossel bay village", "khoikhoi"],
  ["vijayanagar", "southIndian"],
  ["bhimavaram", "southIndian"],
  ["madurai", "southIndian"],
  ["chittoor", "southIndian"],
  ["kolar", "southIndian"],
  ["warangal", "southIndian"],
  ["rajahmundry", "southIndian"],
  ["calicut", "malayali"],
  ["cochin", "malayali"],
  ["quilon", "malayali"],
  ["colombo", "sinhalese"],
  ["ahmedabad", "gujarati"],
  ["cambay", "gujarati"],
  ["surat", "gujarati"],
  ["diu", "gujarati"],
  ["gauda", "bengali"],
  ["patna", "bengali"],
  ["kamtapur", "bengali"],
  ["cuttack", "bengali"],
  ["lahore", "northIndian"],
  ["delhi", "northIndian"],
  ["thana", "northIndian"],
  ["chanderi", "northIndian"],
  ["amber", "northIndian"],
  ["mandu", "northIndian"],
  ["ujjain", "northIndian"],
  ["jaunpur", "northIndian"],
  ["jodhpur", "northIndian"],
  ["thatta", "northIndian"],
  ["srinagar", "northIndian"],
  ["multan", "northIndian"],
  ["goa", "malayali"],
  ["malacca", "malay"],
  ["bandar seri begawan", "malay"],
  ["aceh", "malay"],
  ["patani", "malay"],
  ["gresik", "javanese"],
  ["ternate", "malukan"],
  ["tidore", "malukan"],
  ["banda village", "malukan"],
  ["hitu village", "malukan"],
  ["buru village", "malukan"],
  ["makian village", "malukan"],
  ["gane village", "malukan"],
  ["bastia", "italian"],
  ["cagliari", "italian"],
  ["ceuta", "portuguese"],
  ["algiers", "arabic"],
  ["tripoli", "arabic"],
  ["birgu", "italian"],
  ["syracuse", "italian"],
  ["ragusa", "slavic"],
  ["kerkira", "greek"],
  ["funchal", "portuguese"],
  ["angra", "portuguese"],
  ["las palmas", "spanish"],
  ["ribeira grande", "portuguese"],
  ["sao tome", "portuguese"],
  ["suez", "arabic"],
  ["male", "southAsian"],
  ["maynila", "southeastAsian"],
  ["san juan", "spanish"],
  ["zanzibar", "swahili"],
  ["suq", "arabic"],
  ["mactan village", "cebuano"],
  ["ayutthaya", "thai"],
  ["chiang mai", "thai"],
  ["pegu", "monBurmese"],
  ["binh dinh", "cham"],
  ["luang prabang", "lao"],
  ["yuquot village", "northwestCoast"],
  ["ozette village", "northwestCoast"],
  ["wendat village", "wendat"],
  ["chillicothe", "shawnee"],
  ["guanahani village", "taino"],
  ["coroa vermelha village", "tupi"],
  ["xicalango", "maya"],
  ["chakan putum", "maya"],
  ["cuzamil", "maya"],
  ["merida", "maya"],
  ["tiho", "maya"],
  ["gumarcaj", "maya"],
  ["guatemala city", "maya"],
  ["tzintzuntzan", "purepecha"],
  ["veracruz", "spanish"],
  ["naha", "ryukyuan"],
  ["akkeshi kotan", "ainu"]
]);

const FACTION_CULTURES = new Map([
  ["england", "english"],
  ["scotland", "scottish"],
  ["france", "french"],
  ["spain", "spanish"],
  ["portugal", "portuguese"],
  ["habsburg", "germanic"],
  ["hungary", "hungarian"],
  ["ottoman", "ottoman"],
  ["venice", "italian"],
  ["genoa", "italian"],
  ["papal-states", "italian"],
  ["hospitallers", "italian"],
  ["ming", "chinese"],
  ["inca", "andean"],
  ["safavid", "persian"],
  ["muscovy", "russian"],
  ["poland-lithuania", "polish"],
  ["crimea", "crimeanTatar"],
  ["wallachia", "romanian"],
  ["moldavia", "romanian"],
  ["ragusa", "slavic"],
  ["hejaz", "arabic"],
  ["sweden", "nordic"],
  ["denmark-norway", "nordic"],
  ["songhai", "mande"],
  ["morocco", "arabic"],
  ["ethiopia", "ethiopian"],
  ["vijayanagara", "southIndian"],
  ["gujarat", "gujarati"],
  ["bengal", "bengali"],
  ["delhi", "northIndian"],
  ["ayutthaya", "thai"],
  ["hormuz", "persian"],
  ["ternate", "malukan"],
  ["tidore", "malukan"],
  ["japan", "japanese"],
  ["hosokawa", "japanese"],
  ["ouchi", "japanese"],
  ["shimazu", "japanese"],
  ["so", "japanese"],
  ["shoni", "japanese"],
  ["nagao", "japanese"],
  ["ando", "japanese"],
  ["kakizaki", "japanese"],
  ["ryukyu", "ryukyuan"],
  ["ainu", "ainu"],
  ["joseon", "korean"]
]);

const MALUKAN_LOCATIVE_BY_CITY = new Map([
  ["ternate", "Ternate"],
  ["tidore", "Tidore"],
  ["banda village", "Banda"],
  ["hitu village", "Hitu"],
  ["buru village", "Buru"],
  ["makian village", "Makian"],
  ["gane village", "Gane"]
]);

const ISLAMIC_RELIGIONS = new Set(["sunni-islam", "shia-islam", "ibadi-islam"]);
const SOUTH_ASIAN_NAME_CULTURES = new Set([
  "bengali",
  "gujarati",
  "malayali",
  "northIndian",
  "sinhalese",
  "southAsian",
  "southIndian"
]);
const OTTOMAN_BALKAN_CULTURES = new Set([
  "albanian",
  "bulgarian",
  "greek",
  "hungarian",
  "romanian",
  "ruthenian",
  "russian",
  "serbian",
  "slavic"
]);
const MUHAMMAD_NAME_BY_CULTURE = Object.freeze({
  arabic: "Muhammad",
  eastAfrican: "Muhammad",
  ottoman: "Mehmed",
  persian: "Muhammad",
  southAsian: "Muhammad",
  southeastAsian: "Muhammad",
  centralAsian: "Muhammad Shaybani",
  crimeanTatar: "Mehmed",
  hausa: "Muhammad",
  indoMuslim: "Muhammad",
  kanuri: "Muhammad",
  malay: "Mahmud",
  mande: "Muhammad",
  somali: "Muhammad",
  swahili: "Muhammad",
  tatar: "Muhammad Amin",
  westAfrican: "Mamadou"
});

export function assignRegionalCharacterIdentity({
  identityKey,
  city,
  ship,
  character,
  religionId = character?.religionId ?? null,
  usedNames
}) {
  if (!character || typeof character !== "object") {
    throw new Error("Regional character identity requires a portrait character");
  }
  const subject = city || shipPort(ship);
  const localNameCulture = nameCultureForSubject(subject);
  const religion = inferCharacterReligion({
    identityKey,
    homePort: {
      ...subject,
      nameCulture: subject.nameCulture || localNameCulture
    },
    character: {
      ...character,
      religionId
    }
  });
  return {
    ...assignRegionalCharacterName({
      identityKey,
      city,
      ship,
      sex: character.sex,
      religionId: religion.id,
      usedNames
    }),
    religionId: religion.id
  };
}

export function assignRegionalCharacterName({
  identityKey,
  city,
  ship,
  sex,
  religionId = null,
  usedNames
}) {
  if (typeof identityKey !== "string" || identityKey === "") throw new Error("Character name requires an identity key");
  if (!(usedNames instanceof Set)) throw new Error("Character name assignment requires a shared used-name Set");
  if (sex !== "female" && sex !== "male") throw new Error(`Character name requires an explicit sex: ${sex}`);
  if (religionId !== null) religionById(religionId);
  const subject = city || shipPort(ship);
  const cultureId = chooseNameCultureForSubject(subject, identityKey, religionId);
  const nameCulture = CULTURES[cultureId];
  if (!nameCulture) throw new Error(`Unknown character name culture: ${cultureId}`);
  const gender = sex;
  const givenNames = gender === "female" ? nameCulture.female : nameCulture.male;
  const familyNamePlan = familyNamePlanForSubject(nameCulture, cultureId, subject);
  const familyNames = familyNamePlan.names;
  const capacity = givenNames.length * familyNames.length;
  const normalStartIndex = hashString32(`${identityKey}|${cultureId}|${gender}|name`) % capacity;
  const preferredGivenName = preferredMuhammadName({
    identityKey,
    cultureId,
    gender,
    religionId,
    givenNames
  });
  const startIndex = preferredGivenName === null
    ? normalStartIndex
    : (
        Math.floor(normalStartIndex / givenNames.length) * givenNames.length +
        givenNames.indexOf(preferredGivenName)
      );

  for (let attempt = 0; attempt < capacity; attempt++) {
    const index = familyNamePlan.preferFirst
      ? (
          Math.floor(attempt / givenNames.length) * givenNames.length +
          ((startIndex + attempt) % givenNames.length)
        )
      : (startIndex + attempt) % capacity;
    const givenName = givenNames[index % givenNames.length];
    const familyNameRoot = familyNames[
      Math.floor(index / givenNames.length) % familyNames.length
    ];
    const familyName = familyNameForSex(nameCulture, familyNameRoot, sex);
    const name = nameCulture.order === "family-first"
      ? `${familyName} ${givenName}`
      : `${givenName} ${familyName}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    const identity = {
      name,
      givenName,
      familyName,
      gender,
      nameCulture: cultureId
    };
    registerCharacterProperName(identity);
    return identity;
  }
  throw new Error(`Exhausted ${gender} names for ${cultureId}`);
}

export function assignRegionalFamilyMemberName({ identityKey, relative, sex, usedNames }) {
  if (typeof identityKey !== "string" || identityKey === "") {
    throw new Error("Family member name requires an identity key");
  }
  if (!(usedNames instanceof Set)) {
    throw new Error("Family member name assignment requires a shared used-name Set");
  }
  if (sex !== "female" && sex !== "male") {
    throw new Error(`Family member name requires an explicit sex: ${sex}`);
  }
  if (!relative || typeof relative.familyName !== "string" || relative.familyName.trim() === "") {
    throw new Error("Family member name assignment requires a relative with a family name");
  }
  const cultureId = relative.nameCulture;
  const nameCulture = CULTURES[cultureId];
  if (!nameCulture) throw new Error(`Unknown relative name culture: ${cultureId}`);
  const familyNameRoot = familyNameRootForCharacter(relative);
  const familyName = familyNameForSex(nameCulture, familyNameRoot, sex);
  const givenNames = sex === "female" ? nameCulture.female : nameCulture.male;
  const startIndex = hashString32(`${identityKey}|${cultureId}|${sex}|relative`) % givenNames.length;
  for (let attempt = 0; attempt < givenNames.length; attempt++) {
    const givenName = givenNames[(startIndex + attempt) % givenNames.length];
    const name = nameCulture.order === "family-first"
      ? `${familyName} ${givenName}`
      : `${givenName} ${familyName}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    const identity = {
      name,
      givenName,
      familyName,
      gender: sex,
      nameCulture: cultureId
    };
    registerCharacterProperName(identity);
    return identity;
  }
  throw new Error(`Exhausted ${sex} relatives for ${relative.name}`);
}

export function charactersShareFamilyName(left, right) {
  return (
    left?.nameCulture === right?.nameCulture &&
    familyNameRootForCharacter(left) === familyNameRootForCharacter(right)
  );
}

export function reconcileRegionalCharacterNameForms(root) {
  if (!root || typeof root !== "object") {
    throw new Error("Character name reconciliation requires an object graph");
  }
  const visited = new WeakSet();
  let correctedCount = 0;

  function visit(value) {
    if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || visited.has(value)) return;
    visited.add(value);
    if (
      (value.sex === "female" || value.sex === "male") &&
      typeof value.givenName === "string" &&
      typeof value.familyName === "string" &&
      typeof value.nameCulture === "string"
    ) {
      const nameCulture = CULTURES[value.nameCulture];
      if (!nameCulture) throw new Error(`Unknown saved character name culture: ${value.nameCulture}`);
      const familyNameRoot = familyNameRootForCharacter(value);
      const familyName = familyNameForSex(nameCulture, familyNameRoot, value.sex);
      const name = nameCulture.order === "family-first"
        ? `${familyName} ${value.givenName}`
        : `${value.givenName} ${familyName}`;
      if (value.familyName !== familyName || value.name !== name) {
        if (Object.isFrozen(value)) {
          throw new Error(`Cannot reconcile frozen character name: ${value.name}`);
        }
        Object.assign(value, { name, familyName });
        correctedCount += 1;
      }
      registerCharacterProperName(value);
    }
    for (const child of Object.values(value)) visit(child);
  }

  visit(root);
  return correctedCount;
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

function chooseNameCultureForSubject(subject, identityKey, religionId) {
  const candidates = nameCultureCandidatesForSubject(subject);
  if (religionId === "judaism") return "jewish";
  if (religionId === "sikhism" && SOUTH_ASIAN_NAME_CULTURES.has(candidates[0])) return "sikh";
  if (ISLAMIC_RELIGIONS.has(religionId) && SOUTH_ASIAN_NAME_CULTURES.has(candidates[0])) {
    return "indoMuslim";
  }
  if (
    religionId !== null &&
    candidates.length > 1 &&
    candidates[1] === "ottoman" &&
    OTTOMAN_BALKAN_CULTURES.has(candidates[0])
  ) {
    return ISLAMIC_RELIGIONS.has(religionId) ? "ottoman" : candidates[0];
  }
  const weighted = candidates.length === 1 ? candidates : [candidates[0], candidates[0], candidates[0], candidates[1]];
  return weighted[hashString32(`${identityKey}|name-culture`) % weighted.length];
}

function preferredMuhammadName({ identityKey, cultureId, gender, religionId, givenNames }) {
  if (gender !== "male" || !ISLAMIC_RELIGIONS.has(religionId)) return null;
  const preferred = MUHAMMAD_NAME_BY_CULTURE[cultureId];
  if (!preferred || !givenNames.includes(preferred)) return null;
  return (hashString32(`${identityKey}|muhammad-name`) >>> 16) % 4 === 0 ? preferred : null;
}

function familyNamePlanForSubject(nameCulture, cultureId, subject) {
  if (cultureId !== "malukan") return { names: nameCulture.family, preferFirst: false };
  const cityName = normalizeName(subject.displayCity || subject.city);
  const localLocative = MALUKAN_LOCATIVE_BY_CITY.get(cityName)
    || (subject.factionId === "ternate" ? "Ternate" : null)
    || (subject.factionId === "tidore" ? "Tidore" : null);
  if (!localLocative) return { names: nameCulture.family, preferFirst: false };
  const rivalLocative = localLocative === "Ternate"
    ? "Tidore"
    : localLocative === "Tidore" ? "Ternate" : null;
  return {
    names: [
      localLocative,
      ...nameCulture.family.filter((familyName) => (
        familyName !== localLocative && familyName !== rivalLocative
      ))
    ],
    preferFirst: true
  };
}

function localNameCultureForSubject(subject) {
  const cityCulture = CITY_CULTURES.get(normalizeName(subject.displayCity || subject.city))
    || CITY_CULTURES.get(normalizeName(subject.city));
  if (cityCulture) return cityCulture;
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

function culture(
  male,
  female,
  family,
  order = "given-first",
  familyNameStyle = "invariant"
) {
  if (male.length === 0 || female.length === 0 || family.length === 0) throw new Error("Name culture pools cannot be empty");
  return Object.freeze({
    male: Object.freeze(male),
    female: Object.freeze(female),
    family: Object.freeze(family),
    order,
    familyNameStyle
  });
}

function familyNameForSex(nameCulture, familyNameRoot, sex) {
  if (sex !== "female" && sex !== "male") {
    throw new Error(`Family name requires an explicit sex: ${sex}`);
  }
  if (!nameCulture.family.includes(familyNameRoot)) {
    throw new Error(`${familyNameRoot} is not a registered family-name root`);
  }
  if (nameCulture.familyNameStyle === "icelandic-patronymic") {
    return `${familyNameRoot}${sex === "female" ? "dottir" : "son"}`;
  }
  if (sex === "male" || nameCulture.familyNameStyle === "invariant") return familyNameRoot;
  if (
    nameCulture.familyNameStyle === "east-slavic-adjectival" ||
    nameCulture.familyNameStyle === "slavic-adjectival"
  ) {
    if (/(?:ov|ev|in)$/.test(familyNameRoot)) return `${familyNameRoot}a`;
  }
  if (
    nameCulture.familyNameStyle === "polish-adjectival" ||
    nameCulture.familyNameStyle === "slavic-adjectival"
  ) {
    if (familyNameRoot.endsWith("dzki")) return `${familyNameRoot.slice(0, -4)}dzka`;
    if (familyNameRoot.endsWith("cki")) return `${familyNameRoot.slice(0, -3)}cka`;
    if (familyNameRoot.endsWith("ski")) return `${familyNameRoot.slice(0, -3)}ska`;
  }
  return familyNameRoot;
}

function familyNameRootForCharacter(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Family-name comparison requires a character");
  }
  const nameCulture = CULTURES[character.nameCulture];
  if (!nameCulture) throw new Error(`Unknown character name culture: ${character.nameCulture}`);
  if (typeof character.familyName !== "string" || character.familyName.trim() === "") {
    throw new Error("Character family name is missing");
  }
  const matchingRoot = nameCulture.family.find((candidate) => (
    familyNameForSex(nameCulture, candidate, "male") === character.familyName ||
    familyNameForSex(nameCulture, candidate, "female") === character.familyName
  ));
  if (!matchingRoot) {
    throw new Error(`${character.familyName} is not a ${character.nameCulture} family name`);
  }
  return matchingRoot;
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
