import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text
} from "cursor/canvas";

type Status = "Open" | "Partial" | "Shipped";

type Item = {
  action: string;
  status: Status;
  detail: string;
  note: "First" | "Second" | "Both";
};

const FIRST = "M&R_feedback.txt";
const SECOND = "M&R_Feedback_2.txt";

const CLARITY: Item[] = [
  {
    action: "Show where a campaign is supposed to go",
    status: "Open",
    detail: "Debt, wonders, the white whale, and pirate treasure are real goals with journal text and arrows. Nothing in the sandbox tells a new captain how to find the next rung.",
    note: "Second"
  },
  {
    action: "Explain why the wind changes",
    status: "Partial",
    detail: "The captain's chart can show a wind overlay of broad direction and speed, including trade winds and the South China Sea monsoon. Nothing yet says why the wind changes.",
    note: "Second"
  },
  {
    action: "Name a flag from any distance",
    status: "Open",
    detail: "Flags are drawn. There is no hover that names the ship or city and its ruler when the cloth is too small to read.",
    note: "Second"
  },
  {
    action: "Open the matching screen from the status panel",
    status: "Open",
    detail: "Clicking cargo, crew, food, or water toggles a tooltip. It does not open that screen.",
    note: "Second"
  },
  {
    action: "Add bearing and ruler to mission offers",
    status: "Partial",
    detail: "Offers now read like “677 km to the northeast.” They still do not name the country that holds the destination.",
    note: "First"
  },
  {
    action: "Make the reading face easier to read",
    status: "Open",
    detail: "UI text is a pixel face at fixed sizes. There is no readability option.",
    note: "First"
  },
  {
    action: "Show the sailing lesson before the player is busy",
    status: "Partial",
    detail: "Basics open only after 10 seconds of almost no movement, and only inside the first 90 seconds of travel. A captain who keeps sailing between towns can miss that window and see the lesson later.",
    note: "First"
  },
  {
    action: "Lead with one captain and a staged lesson",
    status: "Open",
    detail: "The first captain is still a choice among strangers. Lessons are not a fixed premise, controls, objective, exposition sequence.",
    note: "First"
  },
  {
    action: "Pin the tutorial, and let the player pin notes",
    status: "Open",
    detail: "Achievements are one list. There are no categories, no always-visible pins, and no player notes.",
    note: "First"
  }
];

const VOYAGE: Item[] = [
  {
    action: "Let the player cancel a quest",
    status: "Open",
    detail: "Active work has a waypoint and no general abandon action. Quest sites and the journal are not a separate quest screen.",
    note: "Second"
  },
  {
    action: "Order ports into a route",
    status: "Partial",
    detail: "Several optional headings can exist at once, each with an arrow. The player cannot sort quests into the order they mean to sail them.",
    note: "Both"
  },
  {
    action: "Mark the destination port itself",
    status: "Partial",
    detail: "Off-screen arrows point at passengers, mail, story sites, and campaign goals. The port on the chart does not grow its own mission mark.",
    note: "First"
  },
  {
    action: "Keep the player's ship in front of names and traffic",
    status: "Open",
    detail: "City names and other sprites can draw over the player in crowded harbors. Nothing forces the player ship above those labels.",
    note: "Second"
  },
  {
    action: "Say the voyage is safe to close",
    status: "Partial",
    detail: "Autosave runs on a timer, and Save and Quit waits for the write. Ordinary quitting does not tell the player the last save succeeded.",
    note: "Second"
  }
];

const WORLD: Item[] = [
  {
    action: "Add Black Sea harbors",
    status: "Open",
    detail: "In the 1522 catalog the sea itself has Trabzon, Kefe, Kezlev, and Salachik. Brăila and Galați sit on the Danube mouth. Istanbul is the strait.",
    note: "First"
  },
  {
    action: "Make a good's home waters obvious",
    status: "Open",
    detail: "Olive oil is a listed market good across many Mediterranean cities, so the whole sea looks like one producer. The demo also keeps the player in that sea.",
    note: "First"
  },
  {
    action: "Decide what the first ship can fight",
    status: "Partial",
    detail: "New games do not request an armed starter. A Mediterranean start is a fishing lugger or a fusta. One note asked for a non-combat first ship; the same note later asked for early guns.",
    note: "First"
  },
  {
    action: "Let a sailing ship crawl through a foul narrow",
    status: "Shipped",
    detail: "Rowing and hauling along shore spend a stamina bar in world sailing, lake battles, and historical battles. It hides when full, blinks when the crew is exhausted, and returns with rest. A boatswain, spare sweeps, a kedge and warp, and a larger or more experienced crew make it last longer.",
    note: "First"
  },
  {
    action: "Choose free rowers or a partial slave crew",
    status: "Open",
    detail: "Crew are hired sailors. There is no galley-slave complement. This needs a design decision before any implementation.",
    note: "First"
  },
  {
    action: "Push ship combat toward period practice",
    status: "Open",
    detail: "The note accepts the current mechanics and asks for more historical gunnery and conduct, as education rather than a bugfix.",
    note: "First"
  }
];

const SHIPPED: Item[] = [
  {
    action: "Play a different song for a nearby fight",
    status: "Shipped",
    detail: "A fight the player is only watching uses its own track. The player's fight still uses the small or big combat score, and that score wins over the nearby one.",
    note: "Second"
  },
  {
    action: "Keep sale details after the first sale",
    status: "Shipped",
    detail: "Hovering another sellable good after a sale still shows that good. Sale feedback returns when nothing is hovered.",
    note: "Second"
  },
  {
    action: "Scale delivery pay with the voyage",
    status: "Shipped",
    detail: "A package still pays 65–160 db, then adds about 1 db for every 12 km.",
    note: "Second"
  },
  {
    action: "Stop recommending an 8,000 km price",
    status: "Shipped",
    detail: "Ordinary goods are not recommended past 4,500 km. Spice, luxury, and precious cargo can still be a long haul.",
    note: "Second"
  },
  {
    action: "Put ports on the Norwegian coast",
    status: "Shipped",
    detail: "Bergen, Nidaros, and Oslo are in the 1522 catalog, on dockable coast, under Denmark-Norway.",
    note: "Second"
  },
  {
    action: "Keep sailing when the window loses focus",
    status: "Shipped",
    detail: "Clicking another window no longer opens the pause menu. A hidden tab and an explicit Steam pause still do.",
    note: "Second"
  },
  {
    action: "Start the departure at anchor",
    status: "Shipped",
    detail: "A new voyage and leaving port hold the ship in place until the player steers. There is no anchor.",
    note: "First"
  },
  {
    action: "Continue a demo voyage in the full game",
    status: "Shipped",
    detail: "The full game imports the demo slot once, into its own save. Playing the demo cannot overwrite a full voyage.",
    note: "Second"
  },
  {
    action: "Harpoon a whale and be towed",
    status: "Shipped",
    detail: "Visible whales can be harpooned, towed until they die, and cut loose. If this still feels absent, the gap is finding the action, not the tow.",
    note: "Second"
  },
  {
    action: "Keep the status panel up in port",
    status: "Shipped",
    detail: "Port and city screens keep the status readout. A wide modal shows the same facts in a bar along the top, and purse changes appear beside the doubloon count.",
    note: "Second"
  },
  {
    action: "Charge debt while the captain stays away",
    status: "Shipped",
    detail: "Interest posts each whole day away from the home port and shows on the quest journal. Paying at home still names that interest. Days at home are not billed.",
    note: "Second"
  },
  {
    action: "Teach provisioning before an ocean crossing",
    status: "Shipped",
    detail: "The first heading farther than the food and water already aboard gets a crew warning with both day counts. Later headings stay quiet.",
    note: "Second"
  }
];

function tone(status: Status): "danger" | "warning" | "success" {
  if (status === "Open") return "danger";
  if (status === "Partial") return "warning";
  return "success";
}

function noteLabel(note: Item["note"]): string {
  if (note === "First") return "First note";
  if (note === "Second") return "Second note";
  return "Both notes";
}

function ActionTable({ items }: { items: Item[] }) {
  return (
    <Table
      headers={["Action", "Status", "Where it stands", "Note"]}
      columnAlign={["left", "left", "left", "left"]}
      rows={items.map((item) => [
        item.action,
        item.status,
        item.detail,
        noteLabel(item.note)
      ])}
      rowTone={items.map((item) => tone(item.status))}
    />
  );
}

const ALL_ITEMS = [...CLARITY, ...VOYAGE, ...WORLD, ...SHIPPED];

function countStatus(status: Status): string {
  return String(ALL_ITEMS.filter((item) => item.status === status).length);
}

export default function PlaytesterActionList() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Playtester action list</H1>
        <Text tone="secondary">
          Deduped from the first note ({FIRST}) and the second ({SECOND}). Status checked against master on 25 Sep 2026, including the port status bar, daily family-debt interest, the chart wind overlay, and the provision warning.
        </Text>
      </Stack>

      <Row gap={16}>
        <Stat value={countStatus("Open")} label="Open" tone="danger" />
        <Stat value={countStatus("Partial")} label="Partly there" tone="warning" />
        <Stat value={countStatus("Shipped")} label="Finished" tone="success" />
      </Row>

      <Callout tone="warning" title="The two notes disagree about the first ship">
        The first note asks to start in a non-combat vessel, then later says being denied combat for so long is frustrating. New games currently pick an unarmed starter. In the Mediterranean that is a fishing lugger or a fusta.
      </Callout>

      <Stack gap={8}>
        <H2>Make the sandbox readable</H2>
        <ActionTable items={CLARITY} />
      </Stack>

      <Stack gap={8}>
        <H2>Voyage, quests, and money</H2>
        <ActionTable items={VOYAGE} />
      </Stack>

      <Stack gap={8}>
        <H2>World and ships</H2>
        <ActionTable items={WORLD} />
      </Stack>

      <Card>
        <CardHeader trailing={<Pill tone="success" active>Leave these</Pill>}>
          Already in the game
        </CardHeader>
        <CardBody>
          <Stack gap={12}>
            <Text>
              Session bugs from the second note are in. The port status bar stays up, family debt posts each day away from home, and the first heading past the stores gets a provision warning. Leaving port still holds the ship until the player steers.
            </Text>
            <ActionTable items={SHIPPED} />
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
