export type Element = "Fire" | "Water" | "Earth" | "Air";
export type CreatureStage = "Level 1" | "Level 2" | "Level 3";

export interface Creature {
  id: string;
  name: string;
  element: Element;
  maxHp: number;
  currentHp: number;
  weakness: Element | null;
  resistance: Element | null;
  ability: string;
  stage: CreatureStage;
  evolutionLine: string[]; // IDs of creatures in the line
  turnsSurvived: number; // For active creature
  isFaceUp: boolean; // For benched creatures
}

// Helper to create a creature instance
export const createCreature = (
  id: string,
  name: string,
  element: Element,
  maxHp: number,
  weakness: Element | null,
  resistance: Element | null,
  ability: string,
  stage: CreatureStage,
  evolutionLine: string[]
): Creature => ({
  id,
  name,
  element,
  maxHp,
  currentHp: maxHp, // Start with full HP
  weakness,
  resistance,
  ability,
  stage,
  evolutionLine,
  turnsSurvived: 0,
  isFaceUp: false,
});

// Define the structure for the incoming raw data
interface RawCreatureLineData {
  line: string;
  element: Element;
  creatures: Array<{
    name: string;
    stage: 0 | 1 | 2; // 0 for Level 1, 1 for Level 2, 2 for Level 3
    hp: number;
    resistance: Element | "None";
    weakness: Element | "None";
  }>;
}

// Raw roster data provided by the user
const rawRosterData: RawCreatureLineData[] = [
  // 🔥 FIRE ELEMENT
  {
    line: "Drakalayo",
    element: "Fire",
    creatures: [
      {
        name: "Sigael",
        stage: 0,
        hp: 90,
        resistance: "Air",
        weakness: "Water",
      },
      {
        name: "Drakalayo",
        stage: 1,
        hp: 120,
        resistance: "Earth",
        weakness: "Water",
      },
      {
        name: "Infernuko",
        stage: 2,
        hp: 150,
        resistance: "Earth",
        weakness: "Water",
      },
    ],
  },
  {
    line: "Silabrix",
    element: "Fire",
    creatures: [
      {
        name: "Asonis",
        stage: 0,
        hp: 100,
        resistance: "None",
        weakness: "Water",
      },
      {
        name: "Silabrix",
        stage: 1,
        hp: 130,
        resistance: "Air",
        weakness: "Earth",
      },
      {
        name: "Alkaulon",
        stage: 2,
        hp: 140,
        resistance: "Air",
        weakness: "Water",
      },
    ],
  },
  {
    line: "Magdanok",
    element: "Fire",
    creatures: [
      {
        name: "Liyabon",
        stage: 0,
        hp: 80,
        resistance: "Water",
        weakness: "Earth",
      },
      {
        name: "Magdanok",
        stage: 1,
        hp: 110,
        resistance: "None",
        weakness: "Water",
      },
      {
        name: "Apoymortis",
        stage: 2,
        hp: 160,
        resistance: "Earth",
        weakness: "Water",
      },
    ],
  },
  // 💧 WATER ELEMENT
  {
    line: "Sireniya",
    element: "Water",
    creatures: [
      {
        name: "Lakanis",
        stage: 0,
        hp: 90,
        resistance: "Fire",
        weakness: "Earth",
      },
      {
        name: "Sireniya",
        stage: 1,
        hp: 120,
        resistance: "Fire",
        weakness: "Air",
      },
      {
        name: "Mardagat",
        stage: 2,
        hp: 140,
        resistance: "Fire",
        weakness: "Earth",
      },
    ],
  },
  {
    line: "Tundragan",
    element: "Water",
    creatures: [
      {
        name: "Yelogon",
        stage: 0,
        hp: 80,
        resistance: "Air",
        weakness: "Earth",
      },
      {
        name: "Tundragan",
        stage: 1,
        hp: 130,
        resistance: "Fire",
        weakness: "Earth",
      },
      {
        name: "Niebarko",
        stage: 2,
        hp: 160,
        resistance: "Earth",
        weakness: "Air",
      },
    ],
  },
  {
    line: "Agwatara",
    element: "Water",
    creatures: [
      {
        name: "Ulanik",
        stage: 0,
        hp: 100,
        resistance: "Fire",
        weakness: "Air",
      },
      {
        name: "Agwatara",
        stage: 1,
        hp: 110,
        resistance: "Earth",
        weakness: "Air",
      },
      {
        name: "Tayodora",
        stage: 2,
        hp: 150,
        resistance: "Fire",
        weakness: "Earth",
      },
    ],
  },
  // 🌱 EARTH ELEMENT
  {
    line: "Grobayan",
    element: "Earth",
    creatures: [
      {
        name: "Putrani",
        stage: 0,
        hp: 110,
        resistance: "Water",
        weakness: "Air",
      },
      {
        name: "Grobayan",
        stage: 1,
        hp: 140,
        resistance: "Fire",
        weakness: "Air",
      },
      {
        name: "Dunobrak",
        stage: 2,
        hp: 160,
        resistance: "Air",
        weakness: "Water",
      },
    ],
  },
  {
    line: "Silvaran",
    element: "Earth",
    creatures: [
      {
        name: "Anitubi",
        stage: 0,
        hp: 90,
        resistance: "Water",
        weakness: "Fire",
      },
      {
        name: "Silvaran",
        stage: 1,
        hp: 130,
        resistance: "Air",
        weakness: "Fire",
      },
      {
        name: "Barkhilan",
        stage: 2,
        hp: 150,
        resistance: "Water",
        weakness: "Fire",
      },
    ],
  },
  {
    line: "Pamantok",
    element: "Earth",
    creatures: [
      {
        name: "Talahus",
        stage: 0,
        hp: 100,
        resistance: "None",
        weakness: "Air",
      },
      {
        name: "Pamantok",
        stage: 1,
        hp: 120,
        resistance: "Water",
        weakness: "Fire",
      },
      {
        name: "Guwardanox",
        stage: 2,
        hp: 170,
        resistance: "Air",
        weakness: "Fire",
      },
    ],
  },
  // 🌬️ AIR ELEMENT
  {
    line: "Himpayan",
    element: "Air",
    creatures: [
      {
        name: "Layawing",
        stage: 0,
        hp: 80,
        resistance: "Earth",
        weakness: "Fire",
      },
      {
        name: "Himpayan",
        stage: 1,
        hp: 110,
        resistance: "None",
        weakness: "Water",
      },
      {
        name: "Zephyltik",
        stage: 2,
        hp: 140,
        resistance: "Earth",
        weakness: "Fire",
      },
    ],
  },
  {
    line: "Kaelykat",
    element: "Air",
    creatures: [
      {
        name: "Haliyas",
        stage: 0,
        hp: 90,
        resistance: "None",
        weakness: "Earth",
      },
      {
        name: "Kaelykat",
        stage: 1,
        hp: 120,
        resistance: "Water",
        weakness: "Fire",
      },
      {
        name: "Bagynox",
        stage: 2,
        hp: 150,
        resistance: "Earth",
        weakness: "Fire",
      },
    ],
  },
  {
    line: "Hangguran",
    element: "Air",
    creatures: [
      {
        name: "Alingaw",
        stage: 0,
        hp: 100,
        resistance: "Earth",
        weakness: "Water",
      },
      {
        name: "Hangguran",
        stage: 1,
        hp: 130,
        resistance: "Earth",
        weakness: "Fire",
      },
      {
        name: "Uludronis",
        stage: 2,
        hp: 160,
        resistance: "None",
        weakness: "Fire",
      },
    ],
  },
];

// Helper to map numerical stage to CreatureStage string
const mapStage = (stageNum: 0 | 1 | 2): CreatureStage => {
  if (stageNum === 0) return "Level 1";
  if (stageNum === 1) return "Level 2";
  return "Level 3"; // stageNum === 2
};

// Helper to map "None" to null for weakness/resistance
const mapElementOrNull = (value: Element | "None"): Element | null => {
  return value === "None" ? null : value;
};

// Helper to generate a slug-like ID from a creature name
const generateId = (name: string): string => {
  return name.toLowerCase().replace(/\s/g, "-");
};

// Process the raw data into the allCreatures array
export const allCreatures: Creature[] = [];

rawRosterData.forEach((lineData) => {
  const evolutionLineIds: string[] = [];
  // First pass to collect all IDs for the current evolution line
  lineData.creatures.forEach((rawCreature) => {
    evolutionLineIds.push(generateId(rawCreature.name));
  });

  // Second pass to create Creature objects and add them to allCreatures
  lineData.creatures.forEach((rawCreature) => {
    allCreatures.push(
      createCreature(
        generateId(rawCreature.name),
        rawCreature.name,
        lineData.element,
        rawCreature.hp,
        mapElementOrNull(rawCreature.weakness),
        mapElementOrNull(rawCreature.resistance),
        `${rawCreature.name}'s ${lineData.element} Burst`,
        mapStage(rawCreature.stage),
        evolutionLineIds // Assign the full evolution line IDs
      )
    );
  });
});

// Function to get a creature by ID
export const getCreatureById = (id: string): Creature | undefined => {
  return allCreatures.find((c) => c.id === id);
};

// Function to get the next evolution stage
export const getNextEvolution = (creature: Creature): Creature | undefined => {
  const currentIndex = creature.evolutionLine.indexOf(creature.id);
  if (
    currentIndex === -1 ||
    currentIndex === creature.evolutionLine.length - 1
  ) {
    return undefined; // Not in an evolution line or already at max stage
  }
  const nextStageId = creature.evolutionLine[currentIndex + 1];
  return getCreatureById(nextStageId);
};

// New: Get all basic creatures
export const getAllBasicCreatures = (): Creature[] => {
  return allCreatures.filter((c) => c.stage === "Level 1");
};

// New: Get all Level 3 creatures
export const getAllLevel3Creatures = (): Creature[] => {
  return allCreatures.filter((c) => c.stage === "Level 3");
};

// Emojis for elements
// const elementEmojis: Record<Element, string> = {
//   Fire: "🔥",
//   Water: "💧",
//   Earth: "🌳",
//   Air: "💨",
// }
