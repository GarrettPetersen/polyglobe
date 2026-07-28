const ANIMAL_REPORTS = new Map(Object.entries({
  tiger: exchange(
    "We found a tiger moving through the forest as quietly as a shadow. Its stripes broke apart among the reeds until only its eyes betrayed it.",
    "Then the stripes are concealment, not ornament. Aristotle described the beast chiefly by rumor; your observation gives me behavior instead."
  ),
  "brown-bear": exchange(
    "The brown bear turned stones with one paw and tore open a fallen tree for grubs. It was immensely strong, yet spent its morning hunting the smallest meals.",
    "An excellent contradiction. Size does not dictate diet, whatever a tidy bestiary may claim. I shall record what it ate as carefully as how it looked."
  ),
  elephant: exchange(
    "The elephant used its trunk like a hand: lifting branches, drawing water, and touching another elephant in greeting. The whole herd guarded its young.",
    "A nose that serves as hand, cup, and trumpet deserves more than a marginal sketch. Your account also supports the old claim that elephants possess uncommon social sense."
  ),
  rhinoceros: exchange(
    "The rhinoceros carried a horn upon its nose and skin folded like plates of armor. It watched poorly, but turned toward the faintest unfamiliar sound.",
    "So the armor is hide, not shell, and its hearing compensates for its sight. That corrects three illustrated manuscripts on my shelf at once."
  ),
  otter: exchange(
    "The otter swam on its back with a fish clasped to its chest, then slid down the muddy bank and returned to do it again for no purpose I could discern.",
    "Natural philosophers too often deny beasts any action without grim necessity. I am prepared to enter play among the otter's observable habits."
  ),
  chipmunk: exchange(
    "The little striped creature filled its cheeks until its head seemed twice its proper width, then carried the hoard into a burrow beneath the roots.",
    "Living storehouses in its own cheeks. Note the seeds and season; perhaps its hoarding explains how it survives the northern winter."
  ),
  giraffe: exchange(
    "The giraffe browsed above every other beast, drawing leaves from thorn trees with a dark, nimble tongue. It moved with a strange rolling gait despite its great height.",
    "At last, proportions from a sober witness rather than a tapestry. Its tongue and gait may be more instructive than the extraordinary neck everyone remembers."
  ),
  fox: exchange(
    "The fox listened beneath the grass, sprang high, and came down nose-first upon prey we could not see. Its ears seemed to guide the whole attack.",
    "Then hearing directs a calculated leap. I shall resist calling it cunning as though it were a little man, but the method plainly deserves that reputation."
  ),
  kangaroo: exchange(
    "The great Australian animal crossed the plain in bounds upon two enormous hind legs. Its young rode safely in a pouch and peered out while the mother fed.",
    "A mode of travel and nurture unlike anything in our books. Draw the feet, tail, and pouch separately; readers will otherwise insist we joined three animals together."
  ),
  parrot: exchange(
    "The parrot copied our words with alarming precision, though it seemed to understand mostly which phrases made sailors surrender fruit.",
    "Imitation joined to reward, then. We must distinguish speech from understanding, but I concede the bird has already trained your crew rather efficiently."
  ),
  lion: exchange(
    "The lions rested together through the heat while one watched the grass. Near dusk they rose as a group, and the country around them suddenly became very quiet.",
    "A social hunter rather than a solitary emblem upon a shield. Record which animals noticed them first; fear can reveal a predator's place in the whole country."
  ),
  eagle: exchange(
    "The eagle circled so high it became a speck, then folded its wings and dropped upon its prey with scarcely a movement wasted.",
    "Sight, height, and speed joined into one method. Your bearings may even let us estimate how far above the ground it hunted."
  ),
  moose: exchange(
    "The moose stood shoulder-deep in a northern marsh, pulling water plants from below the surface. Its antlers spread nearly as wide as our ship's boat.",
    "A gigantic deer that feeds in water. Include the marsh in your drawing; an animal described without its country is only half described."
  ),
  "wild-dog": exchange(
    "The wild dogs hunted as a company, relieving one another during the chase until faster prey tired. They shared the kill rather than fighting over it.",
    "Cooperation as a weapon. That is a finer observation than any measurement of tooth or paw, and one our moralizing bestiaries would likely misunderstand."
  ),
  sloth: exchange(
    "The sloth hung beneath a branch and moved so slowly that moss colored its coat. Yet every grip was sure, even while it slept above the ground.",
    "Slowness may be an adaptation rather than a defect. I shall write that cautiously; scholars are very fond of mistaking unfamiliar success for failure."
  ),
  panda: exchange(
    "The black-and-white bear ate bamboo almost without pause, handling each stalk delicately with its forepaws before discarding most of it.",
    "A bear sustained upon grass and equipped to sort it. Aristotle would object on several grounds, which makes the observation especially valuable."
  ),
  raccoon: exchange(
    "The masked animal tested every lid, knot, and latch near our camp with nimble forepaws. It learned which chest held food considerably faster than some sailors.",
    "Dexterity, memory, and a complete absence of respect for property. I shall record the first two qualities in the formal account."
  ),
  penguin: exchange(
    "The penguin stood upright upon the southern ice, flightless on land but swift beneath the water. Its wings served as fins while it pursued fish.",
    "Then it is no failed bird, but a bird transformed for the sea. Place the swimming figure beside the walking one so no reader mistakes adaptation for deficiency."
  )
}));

export const AUTHORED_ANIMAL_REPORT_IDS = Object.freeze([...ANIMAL_REPORTS.keys()]);

export function naturalistReportDialogueForAnimal(animal) {
  if (!animal || typeof animal !== "object") {
    throw new Error("Naturalist report dialogue requires an animal");
  }
  if (typeof animal.id !== "string" || animal.id.trim() === "") {
    throw new Error("Naturalist report animal has no id");
  }
  const report = ANIMAL_REPORTS.get(animal.id);
  if (!report) throw new Error(`Missing authored naturalist report dialogue: ${animal.id}`);
  return report;
}

export function naturalistJournalDescriptionForAnimal(animal) {
  return naturalistReportDialogueForAnimal(animal).player;
}

export function validateNaturalistReportDialogueCatalog(animals) {
  if (!Array.isArray(animals) || animals.length === 0) {
    throw new Error("Naturalist report dialogue catalog must be a non-empty array");
  }
  const catalogIds = new Set(animals.map((animal) => animal.id));
  for (const reportId of ANIMAL_REPORTS.keys()) {
    if (!catalogIds.has(reportId)) {
      throw new Error(`Naturalist report dialogue names an unknown animal: ${reportId}`);
    }
  }
  const exchanges = new Set();
  for (const animal of animals) {
    const report = naturalistReportDialogueForAnimal(animal);
    const signature = `${report.player}\n${report.naturalist}`;
    if (exchanges.has(signature)) {
      throw new Error(`Duplicate naturalist report dialogue: ${animal.displayName || animal.id}`);
    }
    exchanges.add(signature);
  }
  return animals.length;
}

function exchange(player, naturalist) {
  if (typeof player !== "string" || player.trim() === "") {
    throw new Error("Naturalist report requires player dialogue");
  }
  if (typeof naturalist !== "string" || naturalist.trim() === "") {
    throw new Error("Naturalist report requires naturalist dialogue");
  }
  return Object.freeze({ player, naturalist });
}
