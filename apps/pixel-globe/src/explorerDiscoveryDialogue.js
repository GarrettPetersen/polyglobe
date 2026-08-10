const WORLD_REPORTS = new Map(Object.entries({
  "landmark-great-pyramid": exchange(
    "At Giza, the pyramid swallowed the horizon. Each stone course is taller than a person, yet the four faces rise with a precision I could scarcely find in a shipwright's rule.",
    "Then it is not merely large, but exact. A kingdom vanished, yet its measure survives in stone. That is the sort of wonder I hoped you would teach me to see."
  ),
  "landmark-lake-victoria": exchange(
    "The Nile opened at last into a lake so broad that its far shore vanished. Fishing canoes crossed water that looked, for all the world, like an inland sea.",
    "So the river that feeds Egypt gathers its strength beneath another sky. Put every inlet you saw upon the chart; the beginning of a river can explain half a continent."
  ),
  "landmark-stonehenge": exchange(
    "The stones stand in a ring on the open plain, with great lintels balanced across their tops. No mortar binds them, and no nearby hill explains how they were brought there.",
    "A people without a surviving name arranged stone as carefully as an astronomer arranges numbers. Record the openings in the ring; perhaps they watched the heavens through them."
  ),
  "landmark-pyramids-of-meroe": exchange(
    "Beyond the Nile I found a field of steep, narrow pyramids rising from the red earth. They are smaller than Giza's giant, but so numerous they resemble a stone fleet under sail.",
    "Then Nubia wrote its royal history in a language of its own. Your account will remind my readers that Egypt was never the Nile's only kingdom."
  ),
  "landmark-great-zimbabwe": exchange(
    "Great walls curve across the plateau, built from fitted stone without a trace of mortar. Narrow passages lead between towers and enclosures above the grasslands.",
    "A city of stone in the southern interior, joined to the sea by trade. Bring me the beads, metals, and stories you found there; walls tell only half a city's life."
  ),
  "landmark-petra": exchange(
    "We entered Petra through a cleft barely wide enough for the road. Then a rose-colored facade appeared, carved straight into the cliff, with channels cut to gather every rare drop of rain.",
    "A city made from both stone and scarcity. Copy those water channels carefully. The builders' conquest of the desert may be the greater wonder."
  ),
  "landmark-mohenjo-daro": exchange(
    "The ruined streets cross one another with deliberate order. Houses, wells, and drains were laid in baked brick as though the whole city had first been drawn upon a single board.",
    "Order without a king's boast carved over it. That interests me greatly. A drain and a well may reveal more about ordinary lives than a palace ever could."
  ),
  "landmark-sigiriya": exchange(
    "Sigiriya rises sheer above the forest. A stair once passed between the paws of a colossal lion, climbing toward gardens and a fortress balanced upon the summit.",
    "A king turned an isolated rock into both palace and proclamation. Sketch the gardens as well as the walls; power often reveals itself in what it chooses to make beautiful."
  ),
  "landmark-angkor-wat": exchange(
    "At Angkor, a moat wide as a river holds the temple's reflection. Beyond it, towers shaped like lotus buds rise in ranks above galleries crowded with carved figures.",
    "A sacred mountain rebuilt in stone and surrounded by water. Your description makes its plan sound like a map of the heavens. I want every court and causeway marked."
  ),
  "landmark-great-wall": exchange(
    "The Great Wall follows the ridges until distance turns it into a thread. Towers stand within sight of one another, ready to carry warning by smoke and flame.",
    "Then it is a road for messages as much as a barrier for armies. No single view can contain it, but your course can show how the pieces command the country."
  ),
  "landmark-grand-canal": exchange(
    "The Grand Canal carries barges through country where no natural river runs the right way. Gates raise and lower the water, and grain from the south moves north in an unbroken procession.",
    "An empire fed by an engineered river. Note the locks, storehouses, and junctions. A wonder that moves food may shape more lives than any monument."
  ),
  "landmark-borobudur": exchange(
    "Borobudur climbs in stone terraces, each level ringed with carved stories. At the summit, bell-shaped stupas surround a final dome above the green plain.",
    "A pilgrimage made into an ascent, with every step teaching before the summit is reached. Preserve the order of the terraces; the path itself is part of the work."
  ),
  "landmark-chichen-itza": exchange(
    "At Chichen Itza, a stepped pyramid dominates the city beside a deep natural well. Carved serpents descend its stair, and the courts seem built for crowds long vanished.",
    "Stone, water, and ceremony bound into one place. That great well explains why a city could flourish there; the carvings explain what its people feared and honored."
  ),
  "landmark-nazca-lines": exchange(
    "Across the Nazca desert, straight paths run farther than an arrow can fly. From the surrounding heights they join into birds and beasts, their pale lines untouched by the barren wind.",
    "Pictures too large for their makers to behold at once. Copy their bearings exactly. I want to know whether they address travelers, gods, or the sky itself."
  ),
  "landmark-machu-picchu": exchange(
    "Machu Picchu grips a narrow ridge above the river clouds. Terraces hold the slopes in place, while fitted walls shed the mountain rain without sinking or splitting.",
    "The builders did not conquer the ridge by flattening it; they learned its shape. Your plan should show where their stone follows the mountain rather than fighting it."
  ),
  "landmark-moai-of-rapa-nui": exchange(
    "Along the coasts of Rapa Nui, colossal stone ancestors stand upon ahu with their backs to the sea, watching over the settlements. At Rano Raraku, others remain half-carved in the quarry.",
    "Then they are not figures staring across empty water, but ancestors keeping watch over their descendants. Record the platforms and the roads from the quarry; stone can map a people's memory."
  ),
  "landmark-niagara-falls": exchange(
    "The Niagara River seems broad and calm until its whole width falls away. The thunder reaches you first, then the spray, and only then the white wall of water itself.",
    "A waterfall vast enough to announce itself beyond sight. Mark the portage well. Such power is a wonder to behold and a deadly fact for every navigator."
  ),
  "landmark-victoria-falls": exchange(
    "The Zambezi pours into a narrow chasm and vanishes beneath a tower of mist. Sunlight makes rainbows in the spray, while the ground trembles underfoot.",
    "Now I understand why people call it the smoke that thunders. Draw the gorges below it; the river's escape from that cleft is as remarkable as the fall."
  ),
  "landmark-lake-titicaca": exchange(
    "Lake Titicaca lies beneath snow-covered Andes, yet its water spreads like a sea among the high plains. Reed boats and floating reed islands move upon its deep blue surface.",
    "A maritime world raised into the mountains. Record how its people build with reeds where timber is scarce; ingenuity belongs in our book beside grandeur."
  ),
  "landmark-great-barrier-reef": exchange(
    "For days the sea off Australia changed color beneath us. Coral gardens stretched beyond sight, alive with fish, yet hidden just below the surface.",
    "A living rampart longer than any wall built by kings. Mark every passage carefully; a wonder beneath the sea is also a navigator's peril."
  ),
  "legend-el-dorado": exchange(
    "I followed the golden stories beyond every sensible chart, and there it was: El Dorado, bright enough to make seasoned sailors forget how to speak.",
    "For once, the wildest rumor was too modest. We shall record what you saw, though every reader will accuse us of invention. I confess I might have done the same."
  ),
  "achievement-circumnavigation": exchange(
    "Our log closes on this harbor from the opposite direction. We followed one ocean into the next until the world joined behind us.",
    "Then the globe is no scholar's conjecture in this room. You have measured its continuity with your own wake. That belongs among the greatest feats in this book."
  )
}));

const MOUNTAIN_REPORTS = new Map(Object.entries({
  "Mount Everest": exchange(
    "Everest rose behind ranks of other peaks, yet its white summit still stood alone above the clouds. Even from far below, the scale made every familiar mountain seem unfinished.",
    "If the world wears a crown, you may have found it. We cannot measure that summit yet, but your angles and bearings will give future mapmakers somewhere to begin."
  ),
  "K2": exchange(
    "K2 is a dark pyramid armored in ice, with ridges so steep that snow can scarcely cling to them. It looked less like a mountain to climb than a blade thrust through the range.",
    "A severe mountain, then, and unmistakable from every approach. Draw that sharp profile; a navigator remembers a silhouette long after numbers fade."
  ),
  "Muztag Feng": exchange(
    "Muztag Feng spread a broad white crest above the desert roads. Glaciers poured from it in long frozen streams, feeding valleys that otherwise seemed starved of water.",
    "Then the ice mountain governs the dry country below it. Show me where each frozen tongue descends; a mountain's true reach is often measured by its rivers."
  ),
  "Aconcagua": exchange(
    "Aconcagua towered above the dry Andes, bare rock and pale snow under an empty blue sky. Its height is startling because so little hides it: no forest, no gentle foothills, only ascent.",
    "The great southern sentinel. A clear, dry profile may let us compare its height with peaks half a world away. Your observations are becoming a language of their own."
  ),
  "Kailash": exchange(
    "Kailash has four clean faces meeting beneath a cap of snow. Pilgrims circle it but do not climb, and their reverence made the silence around the mountain feel deliberate.",
    "Then our account must honor the boundary they keep. A wonder is not made greater by planting a flag upon it; sometimes understanding begins with restraint."
  ),
  "Denali": exchange(
    "Denali rises from low country with scarcely any warning, an immense wall of snow above rivers and dark forest. Clouds crossed its middle while the summit remained in another weather.",
    "That rise from plain to summit may be as astonishing as the height itself. Put the lower country in your sketch, so readers can feel what the mountain does to scale."
  ),
  "Mount Kilimanjaro": exchange(
    "Kilimanjaro stands alone above warm grasslands, its snowy crown shining over country where no snow should be. At dawn the whole upper mountain turned rose and gold.",
    "Snow above the equatorial plains: precisely the sort of truth a comfortable scholar would dismiss as sailors' nonsense. Your careful account will make disbelief harder."
  ),
  "Mount Elbrus": exchange(
    "Elbrus carries two rounded summits beneath a single mantle of snow. It rises broad and pale above the Caucasus rather than cutting the sky like a narrow horn.",
    "Twin crowns will make it easy to recognize and hard to confuse. Record which summit appeared higher; even a simple distinction can settle years of argument."
  ),
  "Vinson Massif": exchange(
    "Far south, Vinson rose from an endless waste of ice, a dark rampart beneath a sun that barely circled the horizon. There was no tree, road, or chimney smoke for scale.",
    "A mountain in a world almost emptied of everything else. Keep that page exactly as you drew it. The blankness around the massif is part of the discovery."
  ),
  "Mount Whitney": exchange(
    "Whitney's granite crest rises above a deep, dry valley, with bright snow caught in its upper hollows. From the west it belongs to a long wall of peaks; from the east it seems abrupt and immense.",
    "Two faces of the same mountain, depending on the road taken. Your paired sketches prove why one view is never enough for a true chart."
  ),
  "Mount Kosciuszko": exchange(
    "Kosciuszko is no lonely spire. It is the highest swell in a broad, windswept country of rounded ridges, pale grass, and winter snow.",
    "Then height need not always announce itself with cliffs. I am glad you resisted the temptation to make the mountain more dramatic than it is. Accuracy is its own wonder."
  ),
  "Dhaulagiri": exchange(
    "Dhaulagiri appeared as an enormous white wall above the river gorge, its glaciers broken into blue steps. The valley made the summit seem almost impossibly near and impossibly high at once.",
    "A white mountain ruling one of the world's deepest roads. Trace the gorge beneath it; mountain and passage explain one another."
  ),
  "Mont Blanc": exchange(
    "Mont Blanc shone above the Alps like a dome of polished snow. Great glaciers spilled from its shoulders toward green valleys crowded with farms and church towers.",
    "The contrast is the marvel: cultivated valleys beneath a wilderness of ice. Your drawing should keep both, rather than letting the summit consume the human country below."
  ),
  "Mount Shasta": exchange(
    "Shasta rises by itself above the forests, a broad volcanic cone with a smaller shoulder beside it. Snowfields catch the light long after the lower country has gone dark.",
    "An isolated peak becomes compass, calendar, and landmark for everyone around it. Ask what changes when the snow retreats; local knowledge can add seasons to our chart."
  ),
  "Grand Teton": exchange(
    "The Grand Teton leaps from the valley without a screen of foothills, all sharp granite and snow-filled gullies. Its summit is a narrow point among a row of jagged neighbors.",
    "A mountain whose drama comes from suddenness. Preserve the flat valley at its foot; without that calm foreground, readers will not understand the ascent."
  ),
  "Mount Hood": exchange(
    "Mount Hood is a clean snow cone above dark forests and the great river. Its shape stayed with us for days, changing color while the outline scarcely changed at all.",
    "That is a pilot's mountain, visible enough to order an entire landscape. Put its bearings from the river and coast in the margin."
  ),
  "Mount Washington": exchange(
    "Mount Washington is not the tallest peak I have seen, but its weather is ferocious. Clear sky became cloud and driving sleet before we had crossed the upper rocks.",
    "An excellent warning against judging danger by height alone. I will mark your weather notes boldly; future travelers may value them more than the summit sketch."
  ),
  "Chimborazo": exchange(
    "Chimborazo lifts an ice-covered dome almost directly above the equatorial country. Its broad white mass seems to push higher because tropical fields lie within sight below.",
    "Another snowy contradiction beneath the hot sun, but broader and heavier than Kilimanjaro in your account. Comparing them will make both descriptions stronger."
  ),
  "Mount Kenya": exchange(
    "Mount Kenya's dark, jagged summits rise from forest and high moorland, with small glaciers shining between the rock towers. It looks like the broken core of a far larger mountain.",
    "Then draw the missing shape your eye imagines around those spires. Erosion can tell a mountain's history as clearly as masonry tells a city's."
  ),
  "Puncak Jaya": exchange(
    "Puncak Jaya is a wall of pale, sheer rock above steaming equatorial forest, with snow and ice hidden in its highest folds. I had never seen cold and jungle pressed so close together.",
    "That meeting of climates deserves a full page. Record how quickly the vegetation changed as you climbed; the mountain stacks distant worlds one above another."
  ),
  "Pico de Orizaba": exchange(
    "Orizaba's volcanic cone rises so evenly that it seems drawn with a compass. Snow covers the summit while its lower slopes descend toward green country and the Gulf roads.",
    "A perfect landmark between high plateau and sea. Your bearings may let sailors identify the coast before any headland appears."
  ),
  "Matterhorn": exchange(
    "The Matterhorn is a four-sided horn of dark rock, each ridge cutting cleanly toward the summit. Clouds gathered beneath the point and made it seem detached from the earth.",
    "No reader will mistake that profile. Sometimes a mountain gives the cartographer a symbol more memorable than any written name."
  ),
  "Mauna Kea": exchange(
    "Mauna Kea rises from the ocean as an entire island slope, gentle for leagues before reaching a cold, bare summit. Snow lay above warm Pacific water and black volcanic stone.",
    "Most of the mountain begins beneath your keel, then. That thought enlarges it beyond what the eye can see. Sound the surrounding depths wherever you safely can."
  ),
  "Mount Fuji": exchange(
    "Fuji stood apart from every other height, a near-perfect cone carrying snow above fields, roads, and the sea. Its symmetry made the mountain feel composed rather than accidental.",
    "Now I understand why painters return to it. Give me its outline from several bearings; each view may test just how perfect that cone truly is."
  ),
  "Mount Etna": exchange(
    "Etna breathed smoke above Sicily, and old black lava divided orchards and villages. The same mountain that buried fields has made the surrounding soil astonishingly rich.",
    "Creation and destruction from one furnace. Mark the fresh flows separately from the cultivated slopes; the island's prosperity and danger share a source."
  ),
  "Mount Olympus": exchange(
    "Olympus is not one neat summit but a crown of ravines, cliffs, and high peaks frequently hidden in cloud. From the sea it truly seems to possess its own weather.",
    "No wonder poets placed a court of gods there. We shall keep the old stories beside your measured bearings; imagination is also evidence of how a place commands people."
  ),
  "Ben Nevis": exchange(
    "Ben Nevis rises dark above the sea lochs, its broad upper slopes vanishing into rain. The northern cliffs hold snow in deep gullies even when the lower glens are green.",
    "A mountain shaped as much by Atlantic weather as by stone. Your harbor approaches and cloud notes will make this a useful page as well as a handsome one."
  ),
  "Kanchenjunga": exchange(
    "Kanchenjunga showed five great snowy summits, sometimes appearing together and sometimes separated by cloud. The whole massif glowed at sunrise before the valleys saw daylight.",
    "Five peaks rather than one: preserve their order. A careful sequence of silhouettes may identify the mountain from routes that never share the same view."
  ),
  "Nanga Parbat": exchange(
    "Nanga Parbat rises in one overwhelming sweep above the Indus country, its bare lower walls giving way to hanging ice. The face seemed tall enough to contain several climates.",
    "A naked mountain indeed, displaying its structure instead of hiding among neighboring peaks. Your section of the valley and face may be our most instructive mountain drawing."
  ),
  "Mount Ararat": exchange(
    "Ararat stands alone above the Armenian highlands, a vast snow-capped cone with a lesser cone beside it. Stories of the ancient flood cling to it in every village.",
    "Then set the stories beside the observations and confuse neither for the other. A good atlas has room for what people believe as well as what a captain measures."
  ),
  "Mount Rainier": exchange(
    "Rainier loomed above the inland waters, a massive white volcano cut by rivers of ice. Even at great distance it dwarfed the forested ridges in front of it.",
    "A glacier-clad beacon for the whole sound. Note the river mouths below; all that ice must send its influence far beyond the mountain."
  )
}));

export const AUTHORED_MOUNTAIN_REPORT_NAMES = Object.freeze([...MOUNTAIN_REPORTS.keys()]);
export const AUTHORED_WORLD_REPORT_IDS = Object.freeze([...WORLD_REPORTS.keys()]);

export function explorerReportDialogueForDiscovery(discovery) {
  if (!discovery || typeof discovery !== "object") {
    throw new Error("Explorer report dialogue requires a discovery");
  }
  const key = discovery.kind === "mountain" ? discovery.displayName : discovery.id;
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Explorer report discovery has no dialogue key");
  }
  const report = discovery.kind === "mountain" ? MOUNTAIN_REPORTS.get(key) : WORLD_REPORTS.get(key);
  if (!report) throw new Error(`Missing authored explorer report dialogue: ${key}`);
  return report;
}

export function explorerJournalDescriptionForDiscovery(discovery) {
  return explorerReportDialogueForDiscovery(discovery).player;
}

export function validateExplorerReportDialogueCatalog(discoveries) {
  if (!Array.isArray(discoveries) || discoveries.length === 0) {
    throw new Error("Explorer report dialogue catalog must be a non-empty array");
  }
  const exchanges = new Set();
  for (const discovery of discoveries) {
    const report = explorerReportDialogueForDiscovery(discovery);
    const signature = `${report.player}\n${report.patron}`;
    if (exchanges.has(signature)) {
      throw new Error(`Duplicate explorer report dialogue: ${discovery.displayName || discovery.id}`);
    }
    exchanges.add(signature);
  }
  return discoveries.length;
}

function exchange(player, patron) {
  if (typeof player !== "string" || player.trim() === "") throw new Error("Explorer report requires player dialogue");
  if (typeof patron !== "string" || patron.trim() === "") throw new Error("Explorer report requires patron dialogue");
  return Object.freeze({ player, patron });
}
