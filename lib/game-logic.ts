import {
  type Creature,
  getCreatureById,
  createCreature,
  getAllBasicCreatures,
  getAllLevel3Creatures,
} from "@/lib/creatures";
import type { GameMode } from "@/app/page"; // Assuming GameMode is defined in app/page.tsx

export interface GameState {
  winTally: number;
  aiDifficulty: number;
  playerElementals: Creature[];
  // Add other game state properties as needed for the game logic to function
  // For this specific request, we only need winTally, aiDifficulty, and playerElementals
  // but a full game state would include opponent elementals, turn, etc.
}

// Helper to load win tally from localStorage
export const loadWinTally = (): number => {
  if (typeof window !== "undefined") {
    const savedTally = localStorage.getItem("endless_win_tally");
    return savedTally ? Number.parseInt(savedTally, 10) : 0;
  }
  return 0;
};

// Helper to save win tally to localStorage
export const saveWinTally = (tally: number) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("endless_win_tally", tally.toString());
  }
};

// Function to handle post-win effects
export const handleWin = (
  currentGameState: GameState,
  playerCreatures: Creature[],
  selectedGameMode: GameMode,
): GameState => {
  const newWinTally = currentGameState.winTally + 1;
  saveWinTally(newWinTally);

  const updatedPlayerCreatures = playerCreatures.map((creature) => {
    // 1. All player Elementals de-evolve back to Stage 1 (if in Set 3 mode)
    let deEvolvedCreature = { ...creature };
    if (selectedGameMode.id === "set-3" && creature.stage !== "Level 1") {
      const basicForm = getCreatureById(creature.evolutionLine[0]);
      if (basicForm) {
        deEvolvedCreature = {
          ...basicForm,
          currentHp: creature.currentHp, // Keep current HP for now, healing comes next
          turnsSurvived: 0,
          isFaceUp: creature.isFaceUp,
        };
      }
    }

    // 2. All active Elementals are healed to 75% max HP.
    // 3. Any KO’d Elementals return to play at 50% HP.
    const wasKOd = deEvolvedCreature.currentHp <= 0;
    const newHp = wasKOd
      ? Math.floor(deEvolvedCreature.maxHp * 0.5) // KO'd return at 50%
      : Math.max(
          deEvolvedCreature.currentHp,
          Math.floor(deEvolvedCreature.maxHp * 0.75),
        ); // Active healed to 75% (or current if higher)

    return {
      ...deEvolvedCreature,
      currentHp: newHp,
      turnsSurvived: 0, // Reset turns survived for next battle
    };
  });

  // 4. The AI gets progressively tougher with each battle.
  // This is handled by the `aiDifficulty` which is derived from `newWinTally`
  const newAiDifficulty = newWinTally + 1; // Simple scaling: +1 difficulty per win

  return {
    ...currentGameState,
    winTally: newWinTally,
    aiDifficulty: newAiDifficulty,
    playerElementals: updatedPlayerCreatures,
  };
};

// Function to handle loss condition
export const handleLoss = (currentGameState: GameState): GameState => {
  saveWinTally(0); // Reset win tally on loss
  return {
    ...currentGameState,
    winTally: 0,
    aiDifficulty: 1, // Reset AI difficulty
  };
};

// Function to generate opponent creatures based on win tally
export const generateOpponentCreatures = (
  winCount: number,
  gameMode: GameMode,
): Creature[] => {
  const opponentCreatureIds: string[] = [];
  let creaturesForOpponentSelection: Creature[] = [];

  if (gameMode.id === "set-2") {
    creaturesForOpponentSelection = getAllLevel3Creatures();
  } else {
    // set-3
    creaturesForOpponentSelection = getAllBasicCreatures();
  }

  const tempAvailable = [...creaturesForOpponentSelection];
  while (
    opponentCreatureIds.length < gameMode.playerCreatureCount &&
    tempAvailable.length > 0
  ) {
    const randomIndex = Math.floor(Math.random() * tempAvailable.length);
    opponentCreatureIds.push(tempAvailable[randomIndex].id);
    tempAvailable.splice(randomIndex, 1);
  }

  const hpBuff = 1 + winCount * 0.1; // 10% HP buff per win
  // const damageBuff = winCount * 2 // +2 damage per win (example scaling)

  const opponentCreatureInstances = opponentCreatureIds.map((id) => {
    const template = getCreatureById(id)!;
    const baseHp =
      gameMode.id === "set-2" ? template.maxHp : gameMode.startingHp;
    const creatureMaxHp = baseHp * hpBuff;
    return {
      ...createCreature(
        template.id,
        template.name,
        template.element,
        Math.floor(creatureMaxHp),
        template.weakness,
        template.resistance,
        template.ability,
        template.stage,
        template.evolutionLine,
      ),
      isFaceUp: true,
      // You might want to add a property to Creature to store AI damage buff
      // For now, the AI logic in app/page.tsx will need to apply this buff
      // based on `aiDifficulty` from the game state.
    };
  });

  return opponentCreatureInstances;
};
