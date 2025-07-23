"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type Creature,
  getNextEvolution,
  getAllBasicCreatures,
  getCreatureById,
  createCreature,
  type Element,
  getAllLevel3Creatures,
} from "@/lib/creatures";
import ArenaSlot from "@/components/arena-slot";
import { CreatureCard } from "@/components/creature-card";
import DiceComponent from "@/components/dice-component";
import { RotateCcw, Trophy, Menu } from "lucide-react";
import {
  loadWinTally,
  saveWinTally,
  handleWin,
  handleLoss,
  generateOpponentCreatures,
} from "@/lib/game-logic";

interface PlayerState {
  activeCreature: Creature | null;
  benchCreatures: Creature[];
  skippedTurn: boolean;
}

type GamePhase =
  | "setup"
  | "modeSelection"
  | "creatureSelection"
  | "instructions"
  | "coinToss"
  | "inGame"
  | "gameOver";

export interface GameMode {
  id: string;
  name: string;
  description: string;
  playerCreatureCount: number;
  evolutionTurnsRequired: number;
  allowEvolution: boolean;
  startingHp: number;
}

interface DamageAnimation {
  creatureId: string;
  damage: number;
  timestamp: number;
}

interface GameState {
  gamePhase: GamePhase;
  diceValue: number;
  turn: "player" | "opponent";
  isRolling: boolean;
  hasRolledThisTurn: boolean;
  player: PlayerState;
  opponent: PlayerState;
  isGameOver: boolean;
  winner: "player" | "opponent" | null;
  skipNextTurnFor: "player" | "opponent" | null;
  playerSelectedCreatureIds: string[];
  selectionSubPhase:
    | "chooseElement"
    | "chooseCreature"
    | "chooseSpecificCreatureForSet2"
    | "chooseChallengeType"
    | null;
  currentElementSelection: Element | null;
  creaturesToChooseFrom: Creature[] | null;
  replacementPhaseForPlayer: "player" | "opponent" | null;
  needsReplacementRoll: boolean;
  isTaggingOut: boolean;
  playerActiveIsAttacking: boolean;
  opponentActiveIsAttacking: boolean;
  playerActiveIsShaking: boolean;
  opponentActiveIsShaking: boolean;
  playerActiveIsDefending: boolean;
  opponentActiveIsDefending: boolean;
  selectedGameMode: GameMode | null;
  damageAnimations: DamageAnimation[];
  damagedCreatures: Set<string>;
  selectedCardForDetails: Creature | null;
  isCardDetailsOpen: boolean;
  finalEndlessScore?: number;

  // Corrupted Die mechanic
  lastDieRoll: number | null;
  lastDieRollPlayer: "player" | "opponent" | null;
  isCorrupted: boolean;
  corruptedTurnsRemaining: number;
  corruptedPlayer: "player" | "opponent" | null;
  hasPlayerEvolved: boolean;
  hasOpponentEvolved: boolean;
  coinFlipResult: "Heads" | "Tails" | null;

  // Critical animations
  isCriticalMiss: boolean;
  isCriticalHit: boolean;

  isEndlessModeActive: boolean;
  endlessWins: number; // Managed by game-logic.ts now
  aiDifficulty: number; // Managed by game-logic.ts now
  endlessTrophies: Record<string, number>;
  isAchievementsOpen: boolean;
}

const gameModes: GameMode[] = [
  {
    id: "set-3",
    name: "Evolution Clash",
    description: "Full evolution lines, tags, evolution buffs.",
    playerCreatureCount: 3,
    evolutionTurnsRequired: 2,
    allowEvolution: true,
    startingHp: 50,
  },
  {
    id: "set-2",
    name: "Full Power Duel",
    description: "Full cards with stats, no evolution.",
    playerCreatureCount: 1,
    evolutionTurnsRequired: Number.POSITIVE_INFINITY,
    allowEvolution: false,
    startingHp: 80, // This will be overridden by creature's actual HP
  },
];

const elementEmojis: Record<Element, string> = {
  Fire: "🔥",
  Water: "💧",
  Earth: "🌱",
  Air: "🌬️",
};

const initialGameProgressState = {
  diceValue: 1,
  turn: "player",
  isRolling: false,
  hasRolledThisTurn: false,
  player: { activeCreature: null, benchCreatures: [], skippedTurn: false },
  opponent: { activeCreature: null, benchCreatures: [], skippedTurn: false },
  isGameOver: false,
  winner: null,
  skipNextTurnFor: null,
  playerSelectedCreatureIds: [],
  selectionSubPhase: null,
  currentElementSelection: null,
  creaturesToChooseFrom: null,
  replacementPhaseForPlayer: null,
  needsReplacementRoll: false,
  isTaggingOut: false,
  playerActiveIsAttacking: false,
  opponentActiveIsAttacking: false,
  playerActiveIsShaking: false,
  opponentActiveIsShaking: false,
  playerActiveIsDefending: false,
  opponentActiveIsDefending: false,
  damageAnimations: [],
  damagedCreatures: new Set(),
  selectedCardForDetails: null,
  isCardDetailsOpen: false,
  lastDieRoll: null,
  lastDieRollPlayer: null,
  isCorrupted: false,
  corruptedTurnsRemaining: 0,
  corruptedPlayer: null,
  hasPlayerEvolved: false,
  hasOpponentEvolved: false,
  coinFlipResult: null,
  isCriticalMiss: false,
  isCriticalHit: false,
  // endlessWins and aiDifficulty are now managed by game-logic.ts and loaded separately
};

export default function CardGameArena() {
  const [menuOpen, setMenuOpen] = useState(false);

  //@ts-ignore
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialWins = loadWinTally();
    return {
      ...initialGameProgressState,
      gamePhase: "setup",
      selectedGameMode: null,
      isEndlessModeActive: false,
      endlessWins: initialWins, // Initialize from localStorage
      aiDifficulty: initialWins + 1, // Initialize AI difficulty
      endlessTrophies: {}, // Loaded in useEffect
      isAchievementsOpen: false,
    };
  });

  // Move useRef declarations inside the component
  const rollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const damageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endTurnTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const trophies: Record<string, number> = {};
      gameModes.forEach((mode) => {
        const trophy = localStorage.getItem(`endless_trophy_${mode.id}`);
        if (trophy) {
          trophies[mode.id] = Number.parseInt(trophy, 10);
        }
      });
      setGameState((prev) => ({ ...prev, endlessTrophies: trophies }));
    }
  }, []);

  const addToLog = useCallback((message: string) => {
    console.log(`[Game Log] ${message}`);
  }, []);

  const addDamageAnimation = useCallback(
    (creatureId: string, damage: number) => {
      const newAnimation: DamageAnimation = {
        creatureId: creatureId,
        damage,
        timestamp: Date.now(),
      };

      setGameState((prev) => ({
        ...prev,
        damageAnimations: [...prev.damageAnimations, newAnimation],
        damagedCreatures: new Set([...prev.damagedCreatures, creatureId]),
      }));

      // Remove the animation after 2 seconds
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          damageAnimations: prev.damageAnimations.filter(
            (anim) => anim.timestamp !== newAnimation.timestamp
          ),
        }));
      }, 2000);

      // Remove the damaged state after 1 second (shorter than animation for smooth transition)
      setTimeout(() => {
        setGameState((prev) => {
          const newDamagedCreatures = new Set(prev.damagedCreatures);
          newDamagedCreatures.delete(creatureId);
          return {
            ...prev,
            damagedCreatures: newDamagedCreatures,
          };
        });
      }, 1000);
    },
    []
  );

  const restartGame = useCallback(() => {
    const initialWins = loadWinTally(); // Load current win tally for endless mode
    //@ts-ignore
    setGameState((prev) => ({
      ...initialGameProgressState,
      gamePhase: "setup",
      selectedGameMode: null,
      isEndlessModeActive: false,
      endlessWins: initialWins,
      aiDifficulty: initialWins + 1,
      endlessTrophies: prev.endlessTrophies,
      isAchievementsOpen: false,
    }));
    addToLog("Game restarted. Select a game mode to begin!");
  }, [addToLog]);

  const handleBackToMenu = useCallback(() => {
    const initialWins = loadWinTally(); // Load current win tally for endless mode
    //@ts-ignore
    setGameState((prev) => ({
      ...initialGameProgressState,
      gamePhase: "modeSelection",
      selectedGameMode: null,
      isEndlessModeActive: false,
      endlessWins: initialWins,
      aiDifficulty: initialWins + 1,
      endlessTrophies: prev.endlessTrophies,
      isAchievementsOpen: false,
    }));
    addToLog("Returned to game mode selection.");
  }, [addToLog]);

  const handleRestartCurrentMode = useCallback(() => {
    //@ts-ignore
    setGameState((prev) => {
      if (!prev.selectedGameMode) {
        // Fallback to a full menu return if something went wrong
        const initialWins = loadWinTally();
        return {
          ...initialGameProgressState,
          gamePhase: "modeSelection",
          selectedGameMode: null,
          isEndlessModeActive: false,
          endlessWins: initialWins,
          aiDifficulty: initialWins + 1,
          endlessTrophies: prev.endlessTrophies,
          isAchievementsOpen: false,
        };
      }
      // For endless mode, restart means starting a new run, so reset win tally
      const newEndlessWins = prev.isEndlessModeActive ? 0 : prev.endlessWins;
      if (prev.isEndlessModeActive) {
        saveWinTally(0); // Reset localStorage tally for a new endless run
      }

      return {
        ...initialGameProgressState,
        gamePhase: "instructions",
        selectedGameMode: prev.selectedGameMode,
        isEndlessModeActive: prev.isEndlessModeActive,
        endlessWins: newEndlessWins,
        aiDifficulty: newEndlessWins + 1,
        endlessTrophies: prev.endlessTrophies,
        isAchievementsOpen: false,
      };
    });
    addToLog("Restarting current game mode.");
  }, [addToLog]);

  const openAchievements = useCallback(() => {
    setGameState((prev) => ({ ...prev, isAchievementsOpen: true }));
  }, []);

  const closeAchievements = useCallback(() => {
    setGameState((prev) => ({ ...prev, isAchievementsOpen: false }));
  }, []);

  const handleCardDetailView = useCallback((creature: Creature) => {
    setGameState((prev) => ({
      ...prev,
      selectedCardForDetails: creature,
      isCardDetailsOpen: true,
    }));
  }, []);

  const closeCardDetails = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      selectedCardForDetails: null,
      isCardDetailsOpen: false,
    }));
  }, []);

  const handleCreatureReplacementLogic = useCallback(
    (
      prevState: GameState,
      playerType: "player" | "opponent",
      newActiveCreature: Creature
    ): GameState => {
      const targetPlayerState =
        playerType === "player" ? prevState.player : prevState.opponent;
      const updatedActiveCreature = { ...newActiveCreature, isFaceUp: true };

      const updatedBenchCreatures = targetPlayerState.benchCreatures.filter(
        (c) => c.id !== newActiveCreature.id
      );

      // If the old active creature is not KO'd, add it back to the bench
      if (
        targetPlayerState.activeCreature &&
        targetPlayerState.activeCreature.currentHp > 0
      ) {
        updatedBenchCreatures.push({
          ...targetPlayerState.activeCreature,
          isFaceUp: true,
          turnsSurvived: 0,
        });
      }

      const updatedPlayerState = {
        ...targetPlayerState,
        activeCreature: updatedActiveCreature,
        benchCreatures: updatedBenchCreatures,
      };

      return {
        ...prevState,
        player: playerType === "player" ? updatedPlayerState : prevState.player,
        opponent:
          playerType === "opponent" ? updatedPlayerState : prevState.opponent,
        replacementPhaseForPlayer: null,
      };
    },
    []
  );

  const applyDamage = useCallback(
    (
      attacker: Creature,
      defender: Creature,
      baseDamage: number,
      isCriticalMiss = false
    ): number => {
      let finalDamage = baseDamage;

      // Apply evolution buffs for damage dealt (attacker)
      if (attacker.stage === "Level 2") {
        finalDamage += 10;
      } else if (attacker.stage === "Level 3") {
        finalDamage += 20;
      }

      // Apply AI difficulty damage buff if opponent is attacking
      if (gameState.turn === "opponent") {
        finalDamage += gameState.aiDifficulty - 1; // Add (difficulty - 1) extra damage
        addToLog(
          `Opponent's AI difficulty adds ${
            gameState.aiDifficulty - 1
          } extra damage!`
        );
      }

      // Apply weakness/resistance only if not a critical miss
      if (!isCriticalMiss) {
        if (defender.weakness === attacker.element) {
          finalDamage += 10;
          addToLog(
            `${defender.name} is weak to ${attacker.element}! Extra 10 damage.`
          );
        } else if (defender.resistance === attacker.element) {
          finalDamage -= 10;
          addToLog(
            `${defender.name} resists ${attacker.element}! Reduced 10 damage.`
          );
        }
      }

      // Apply evolution buffs for damage received (defender) - SUBTRACT from final damage
      if (defender.stage === "Level 2") {
        finalDamage -= 10;
      } else if (defender.stage === "Level 3") {
        finalDamage -= 20;
      }

      finalDamage = Math.max(0, finalDamage);

      // Add damage animation for the defender
      addDamageAnimation(defender.instanceId, finalDamage); // <-- use instanceId

      setGameState((prev) => {
        const updatedPlayer = { ...prev.player };
        const updatedOpponent = { ...prev.opponent };

        if (
          prev.player.activeCreature &&
          prev.player.activeCreature === defender
        ) {
          updatedPlayer.activeCreature = {
            ...defender,
            currentHp: Math.max(0, defender.currentHp - finalDamage),
          };
        } else if (
          prev.opponent.activeCreature &&
          prev.opponent.activeCreature === defender
        ) {
          updatedOpponent.activeCreature = {
            ...defender,
            currentHp: Math.max(0, defender.currentHp - finalDamage),
          };
        }

        return { ...prev, player: updatedPlayer, opponent: updatedOpponent };
      });

      const newHp = Math.max(0, defender.currentHp - finalDamage);
      addToLog(
        `${defender.name} took ${finalDamage} damage. HP: ${newHp}/${defender.maxHp}`
      );
      return newHp;
    },
    [addToLog, addDamageAnimation, gameState.turn, gameState.aiDifficulty]
  );

  const handleEndlessNextBattleSetup = useCallback(() => {
    setGameState((prev) => {
      if (!prev.selectedGameMode) return prev;

      // Apply win effects using the game-logic helper
      const updatedPlayerCreatures = [
        ...(prev.player.activeCreature ? [prev.player.activeCreature] : []),
        ...prev.player.benchCreatures,
      ];
      const {
        winTally: newWins,
        aiDifficulty: newAiDifficulty,
        playerElementals: processedPlayerCreatures,
      } = handleWin(
        {
          winTally: prev.endlessWins,
          aiDifficulty: prev.aiDifficulty,
          playerElementals: updatedPlayerCreatures,
        },
        updatedPlayerCreatures,
        prev.selectedGameMode
      );

      // Re-distribute processed player creatures back to active/bench
      const healedActive = processedPlayerCreatures[0] || null;
      const healedBench = processedPlayerCreatures.slice(1);

      // Generate new opponent based on new win tally
      const newOpponentCreatures = generateOpponentCreatures(
        newWins,
        prev.selectedGameMode
      );

      addToLog(
        `Victory! You have ${newWins} wins. Prepare for the next challenger!`
      );

      return {
        ...prev,
        endlessWins: newWins,
        aiDifficulty: newAiDifficulty,
        player: {
          ...prev.player,
          activeCreature: healedActive,
          benchCreatures: healedBench,
        },
        opponent: {
          activeCreature: newOpponentCreatures[0] || null,
          benchCreatures: newOpponentCreatures.slice(1),
          skippedTurn: false,
        },
        turn: "player",
        hasRolledThisTurn: false,
        isRolling: false,
        replacementPhaseForPlayer: null,
        playerActiveIsAttacking: false,
        opponentActiveIsAttacking: false,
        playerActiveIsShaking: false,
        opponentActiveIsShaking: false,
        playerActiveIsDefending: false,
        opponentActiveIsDefending: false,
        isGameOver: false, // Reset game over state for next battle
        winner: null,
        skipNextTurnFor: null,
        lastDieRoll: null,
        lastDieRollPlayer: null,
        isCorrupted: false,
        corruptedTurnsRemaining: 0,
        corruptedPlayer: null,
        hasPlayerEvolved: false,
        hasOpponentEvolved: false,
        isCriticalMiss: false,
        isCriticalHit: false,
      };
    });
  }, [addToLog]);

  const handleEndlessRunEnd = useCallback(() => {
    setGameState((prev) => {
      const currentWins = prev.endlessWins;
      const modeId = prev.selectedGameMode!.id;
      const existingTrophy = prev.endlessTrophies[modeId] || 0;
      const newTrophies = { ...prev.endlessTrophies };

      if (currentWins > existingTrophy) {
        addToLog(`New record! You achieved ${currentWins} wins!`);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `endless_trophy_${modeId}`,
            currentWins.toString()
          );
        }
        newTrophies[modeId] = currentWins;
      } else {
        addToLog(`Your run ended with ${currentWins} wins.`);
      }

      // Apply loss effects using the game-logic helper
      const { winTally: resetWinTally, aiDifficulty: resetAiDifficulty } =
        handleLoss({
          winTally: prev.endlessWins,
          aiDifficulty: prev.aiDifficulty,
          playerElementals: [], // Not needed for loss logic, but part of interface
        });

      return {
        ...prev,
        isGameOver: true,
        winner: "opponent",
        gamePhase: "gameOver",
        endlessTrophies: newTrophies,
        finalEndlessScore: currentWins, // Store the score BEFORE resetting
        endlessWins: resetWinTally, // Reset win tally in state
        aiDifficulty: resetAiDifficulty, // Reset AI difficulty in state
      };
    });
  }, [addToLog]);

  const checkWinCondition = useCallback(() => {
    setGameState((prev) => {
      const newState = { ...prev };
      let playerLost = false;
      let opponentLost = false;

      if (newState.selectedGameMode?.id === "set-2") {
        playerLost = !!(
          newState.player.activeCreature &&
          newState.player.activeCreature.currentHp <= 0
        );
        opponentLost = !!(
          newState.opponent.activeCreature &&
          newState.opponent.activeCreature.currentHp <= 0
        );
      } else {
        // Set 3 logic
        const isPlayerActiveDefeated = !!(
          newState.player.activeCreature &&
          newState.player.activeCreature.currentHp <= 0
        );
        const hasPlayerBench = newState.player.benchCreatures.some(
          (c) => c.currentHp > 0
        );
        if (isPlayerActiveDefeated && !hasPlayerBench) {
          playerLost = true;
        } else if (isPlayerActiveDefeated && hasPlayerBench) {
          addToLog("Player must choose a replacement.");
          return { ...newState, replacementPhaseForPlayer: "player" };
        }

        const isOpponentActiveDefeated = !!(
          newState.opponent.activeCreature &&
          newState.opponent.activeCreature.currentHp <= 0
        );
        const hasOpponentBench = newState.opponent.benchCreatures.some(
          (c) => c.currentHp > 0
        );
        if (isOpponentActiveDefeated && !hasOpponentBench) {
          opponentLost = true;
        } else if (isOpponentActiveDefeated && hasOpponentBench) {
          const viableBench = newState.opponent.benchCreatures.filter(
            (c) => c.currentHp > 0
          );
          const replacement =
            viableBench[Math.floor(Math.random() * viableBench.length)];
          const stateAfterOpponentReplacement = handleCreatureReplacementLogic(
            newState,
            "opponent",
            replacement
          );
          addToLog(`Opponent replaced with ${replacement.name}.`);
          return stateAfterOpponentReplacement;
        }
      }

      if (opponentLost) {
        if (newState.isEndlessModeActive) {
          // Defer to next state update cycle
          setTimeout(() => handleEndlessNextBattleSetup(), 0);
          return newState; // Return current state, next setup will be handled
        } else {
          addToLog("Opponent defeated! Player wins!");
          return {
            ...newState,
            isGameOver: true,
            winner: "player",
            gamePhase: "gameOver",
          };
        }
      }

      if (playerLost) {
        if (newState.isEndlessModeActive) {
          // Defer to next state update cycle
          setTimeout(() => handleEndlessRunEnd(), 0);
          return newState; // Return current state, end run will be handled
        } else {
          addToLog("Player defeated! Opponent wins!");
          return {
            ...newState,
            isGameOver: true,
            winner: "opponent",
            gamePhase: "gameOver",
          };
        }
      }

      return newState;
    });
  }, [
    addToLog,
    handleCreatureReplacementLogic,
    handleEndlessNextBattleSetup,
    handleEndlessRunEnd,
  ]);

  const endTurn = useCallback(
    (criticalHitOccurred = false) => {
      console.log("endTurn called. Current turn:", gameState.turn);

      if (
        gameState.isGameOver ||
        gameState.gamePhase !== "inGame" ||
        gameState.replacementPhaseForPlayer ||
        gameState.isTaggingOut
      )
        return;
      //@ts-ignore
      setGameState((prev) => {
        const currentTurnPlayerType = prev.turn; // "player" or "opponent"
        const currentTurnPlayerState =
          prev.turn === "player" ? prev.player : prev.opponent;
        const updatedActiveCreature = currentTurnPlayerState.activeCreature
          ? {
              ...currentTurnPlayerState.activeCreature,
              turnsSurvived:
                currentTurnPlayerState.activeCreature.turnsSurvived + 1,
            }
          : null;

        const updatedPlayerState =
          prev.turn === "player"
            ? { ...prev.player, activeCreature: updatedActiveCreature }
            : prev.player;
        const updatedOpponentState =
          prev.turn === "opponent"
            ? { ...prev.opponent, activeCreature: updatedActiveCreature }
            : prev.opponent;

        let nextTurn = prev.turn === "player" ? "opponent" : "player";
        let newSkipNextTurnFor = prev.skipNextTurnFor;

        // If a critical hit just occurred, the *current* player (attacker) will skip their *next* turn.
        // This means we set the flag for them to skip when it becomes their turn again.
        if (criticalHitOccurred) {
          newSkipNextTurnFor = currentTurnPlayerType;
          addToLog(
            `${
              currentTurnPlayerType === "player" ? "Player" : "Opponent"
            } will skip their next turn due to Critical Hit!`
          );
        }

        // Check if the *next* player (who is about to start their turn) is supposed to skip
        if (newSkipNextTurnFor === nextTurn) {
          addToLog(
            `${nextTurn === "player" ? "Player" : "Opponent"} skips their turn!`
          );
          newSkipNextTurnFor = null; // Clear the flag after it's acted upon
          nextTurn = nextTurn === "player" ? "opponent" : "player"; // Skip this player, move to the next
        }

        addToLog(
          `Turn ended. It's now ${
            nextTurn === "player" ? "your" : "opponent's"
          } turn.`
        );

        return {
          ...prev,
          player: updatedPlayerState,
          opponent: updatedOpponentState,
          turn: nextTurn,
          hasRolledThisTurn: false,
          isTaggingOut: false,
          skipNextTurnFor: newSkipNextTurnFor, // Update the skip flag here
          // Handle corruption turn countdown
          corruptedTurnsRemaining:
            prev.isCorrupted && prev.corruptedTurnsRemaining > 0
              ? prev.corruptedTurnsRemaining - 1
              : prev.corruptedTurnsRemaining,
          isCorrupted:
            prev.isCorrupted && prev.corruptedTurnsRemaining > 1 ? true : false,
          corruptedPlayer:
            prev.isCorrupted && prev.corruptedTurnsRemaining > 1
              ? prev.corruptedPlayer
              : null,
          // Reset critical animations on turn end
          isCriticalMiss: false,
          isCriticalHit: false,
          needsReplacementRoll: false, // Ensure this is reset
        };
      });

      setGameState((prev) => {
        // Handle corruption end and announce it
        const corruptionEnding =
          prev.isCorrupted && prev.corruptedTurnsRemaining === 1;
        if (corruptionEnding) {
          addToLog("The corrupted die's power fades away...");

          // Apply Aftershock Penalty to the previously corrupted creature
          if (prev.corruptedPlayer) {
            const corruptedPlayerState =
              prev.corruptedPlayer === "player" ? prev.player : prev.opponent;
            const corruptedCreature = corruptedPlayerState.activeCreature;

            if (corruptedCreature && corruptedCreature.currentHp > 0) {
              addToLog(
                `${corruptedCreature.name} suffers Aftershock Penalty! +10 damage from corruption backlash!`
              );

              // Apply the aftershock damage
              const aftershockDamage = 10;
              const newHp = Math.max(
                0,
                corruptedCreature.currentHp - aftershockDamage
              );

              // Add damage animation
              addDamageAnimation(corruptedCreature.id, aftershockDamage);

              // Update the creature's HP
              setTimeout(() => {
                setGameState((aftershockState) => {
                  const updatedPlayer = { ...aftershockState.player };
                  const updatedOpponent = { ...aftershockState.opponent };

                  if (
                    prev.corruptedPlayer === "player" &&
                    updatedPlayer.activeCreature?.id === corruptedCreature.id
                  ) {
                    updatedPlayer.activeCreature = {
                      ...corruptedCreature,
                      currentHp: newHp,
                    };
                  } else if (
                    prev.corruptedPlayer === "opponent" &&
                    updatedOpponent.activeCreature?.id === corruptedCreature.id
                  ) {
                    updatedOpponent.activeCreature = {
                      ...corruptedCreature,
                      currentHp: newHp,
                    };
                  }

                  return {
                    ...aftershockState,
                    player: updatedPlayer,
                    opponent: updatedOpponent,
                  };
                });

                // Check for win condition after aftershock damage
                setTimeout(() => {
                  checkWinCondition();
                }, 500);
              }, 1000);
            }
          }
        }
        return prev;
      });
    },
    [
      gameState.isGameOver,
      gameState.gamePhase,
      addToLog,
      gameState.replacementPhaseForPlayer,
      addDamageAnimation,
      checkWinCondition,
    ]
  );

  const rollDice = useCallback(() => {
    console.log(
      "rollDice called. Current turn:",
      gameState.turn,
      "hasRolledThisTurn:",
      gameState.hasRolledThisTurn
    );
    if (
      gameState.isRolling ||
      gameState.isGameOver ||
      gameState.hasRolledThisTurn ||
      gameState.gamePhase !== "inGame" ||
      gameState.replacementPhaseForPlayer ||
      gameState.isTaggingOut
    )
      return;

    setGameState((prev) => ({
      ...prev,
      isRolling: true,
      hasRolledThisTurn: true,
      isTaggingOut: false,
      playerActiveIsAttacking: false,
      opponentActiveIsAttacking: false,
      playerActiveIsShaking: false,
      opponentActiveIsShaking: false,
      playerActiveIsDefending: false,
      opponentActiveIsDefending: false,
      // Reset critical animations when starting new roll
      isCriticalMiss: false,
      isCriticalHit: false,
    }));
    addToLog(
      `${gameState.turn === "player" ? "Player" : "Opponent"} rolls the dice...`
    );

    // Clear any previous timers to prevent conflicts from previous rolls
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    if (damageTimerRef.current) clearTimeout(damageTimerRef.current);
    if (endTurnTimerRef.current) clearTimeout(endTurnTimerRef.current);

    rollTimerRef.current = setTimeout(() => {
      const newValue = Math.floor(Math.random() * 6) + 1;

      // Check for corruption trigger
      let shouldTriggerCorruption = false;

      // Check for critical miss (roll of 1) and critical hit (roll of 6)
      const isCriticalMiss = newValue === 1;
      const isCriticalHit = newValue === 6;

      if (
        !gameState.isCorrupted &&
        gameState.lastDieRoll === newValue &&
        gameState.lastDieRollPlayer !== gameState.turn &&
        gameState.hasPlayerEvolved &&
        gameState.hasOpponentEvolved
      ) {
        shouldTriggerCorruption = true;
      }

      setGameState((prev) => ({
        ...prev,
        diceValue: newValue,
        isRolling: false,
        lastDieRoll: newValue,
        lastDieRollPlayer: prev.turn,
        // Set critical animation states
        isCriticalMiss: isCriticalMiss,
        isCriticalHit: isCriticalHit,
        // Trigger corruption if conditions are met
        isCorrupted: shouldTriggerCorruption ? true : prev.isCorrupted,
        corruptedTurnsRemaining: shouldTriggerCorruption
          ? 3
          : prev.corruptedTurnsRemaining,
        corruptedPlayer: shouldTriggerCorruption
          ? prev.turn
          : prev.corruptedPlayer,
      }));

      if (shouldTriggerCorruption) {
        addToLog(`Consecutive ${newValue}s rolled! The die becomes CORRUPTED!`);
      } else {
        addToLog(`Dice rolled: ${newValue}!`);
      }

      const attacker =
        gameState.turn === "player"
          ? gameState.player.activeCreature
          : gameState.opponent.activeCreature;
      const defender =
        gameState.turn === "player"
          ? gameState.opponent.activeCreature
          : gameState.player.activeCreature;

      if (!attacker || !defender) {
        addToLog("Error: Active creatures not found for combat.");
        return;
      }

      setGameState((prev) => ({
        ...prev,
        playerActiveIsAttacking: prev.turn === "player",
        opponentActiveIsAttacking: prev.turn === "opponent",
        playerActiveIsDefending: prev.turn === "opponent",
        opponentActiveIsDefending: prev.turn === "player",
      }));

      damageTimerRef.current = setTimeout(() => {
        let damage = 0;
        const isCriticalMiss = newValue === 1;
        const isCriticalHit = newValue === 6;

        switch (newValue) {
          case 1:
            // Critical Miss - 10 damage to self
            damage = 10;
            addToLog(`${attacker.name} suffered a Critical Miss!`);
            applyDamage(attacker, attacker, damage, true);
            break;
          case 2:
          case 3:
            // Normal Hit - 20 base damage to opponent
            damage = 20;
            addToLog(`${attacker.name} landed a Normal Hit!`);
            applyDamage(attacker, defender, damage);
            break;
          case 4:
          case 5:
            // Strong Hit - 30 base damage to opponent
            damage = 30;
            addToLog(`${attacker.name} landed a Strong Hit!`);
            applyDamage(attacker, defender, damage);
            break;
          case 6:
            // Critical Hit - 50 base damage to opponent + attacker forfeits next turn
            damage = 50;
            addToLog(`${attacker.name} landed a Critical Hit!`);
            applyDamage(attacker, defender, damage);
            addToLog(
              `${attacker.name} deals massive damage but forfeits their next turn!`
            ); // Log for attacker
            break;
        }

        // Apply visual effects based on the roll result
        setGameState((prev) => {
          const isPlayerAttacking = prev.turn === "player";

          return {
            ...prev,
            playerActiveIsShaking:
              (isPlayerAttacking && isCriticalMiss) ||
              (!isPlayerAttacking && !isCriticalMiss),
            opponentActiveIsShaking:
              (!isPlayerAttacking && isCriticalMiss) ||
              (isPlayerAttacking && !isCriticalMiss),
          };
        });

        endTurnTimerRef.current = setTimeout(() => {
          setGameState((prev) => ({
            ...prev,
            playerActiveIsAttacking: false,
            opponentActiveIsAttacking: false,
            playerActiveIsShaking: false,
            opponentActiveIsShaking: false,
            playerActiveIsDefending: false,
            opponentActiveIsDefending: false,
          }));

          // Check win condition before ending turn
          checkWinCondition();

          // End the current turn and transition to the defending player
          // Add a small delay here to allow React to process checkWinCondition's state update
          setTimeout(() => {
            endTurn(isCriticalHit);
          }, 50); // Small delay to allow re-render from checkWinCondition to settle
        }, 300);
      }, 500);
    }, 1000);
  }, [
    gameState,
    addToLog,
    applyDamage,
    checkWinCondition,
    endTurn,
    rollTimerRef,
    damageTimerRef,
    endTurnTimerRef,
  ]);

  // Removed rollReplacementDice as it's no longer needed.

  const handleTagOut = useCallback(
    (playerType: "player" | "opponent", benchCreature: Creature) => {
      if (gameState.selectedGameMode?.id !== "set-3") return; // Tag out only allowed in Set 3
      setGameState((prev) => {
        const currentPlayerState =
          playerType === "player" ? prev.player : prev.opponent;

        if (!currentPlayerState.activeCreature) {
          addToLog("No active creature to tag out.");
          return { ...prev, isTaggingOut: false };
        }

        const benchIndex = currentPlayerState.benchCreatures.findIndex(
          (c) => c.id === benchCreature.id
        );
        if (benchIndex === -1) {
          addToLog("Selected creature not found on bench.");
          return { ...prev, isTaggingOut: false };
        }

        const newBenchCreatures = [...currentPlayerState.benchCreatures];
        const oldActiveCreature = {
          ...currentPlayerState.activeCreature,
          isFaceUp: true,
          turnsSurvived: 0,
        }; // Reset turns survived when tagged out
        const newActiveCreature = {
          ...newBenchCreatures[benchIndex],
          isFaceUp: true,
          turnsSurvived: 0,
        }; // Reset turns survived when tagged in

        newBenchCreatures[benchIndex] = oldActiveCreature;

        const updatedPlayerState = {
          ...currentPlayerState,
          activeCreature: newActiveCreature,
          benchCreatures: newBenchCreatures,
        };

        addToLog(
          `${playerType === "player" ? "Player" : "Opponent"} tagged out ${
            oldActiveCreature.name
          } for ${newActiveCreature.name}.`
        );

        return {
          ...prev,
          player: playerType === "player" ? updatedPlayerState : prev.player,
          opponent:
            playerType === "opponent" ? updatedPlayerState : prev.opponent,
          isTaggingOut: false,
        };
      });

      // End the turn after tagging out
      setTimeout(() => {
        endTurn();
      }, 1000);
    },
    [gameState.selectedGameMode?.id, addToLog, endTurn]
  );

  const handleEvolution = useCallback(
    (playerType: "player" | "opponent") => {
      if (gameState.selectedGameMode?.id !== "set-3") return; // Evolution only allowed in Set 3
      setGameState((prev) => {
        const currentPlayerState =
          playerType === "player" ? prev.player : prev.opponent;
        const active = currentPlayerState.activeCreature;
        const currentMode = prev.selectedGameMode;

        if (!active || !currentMode) return prev;

        const nextEvolution = getNextEvolution(active);

        if (
          nextEvolution &&
          currentMode.allowEvolution &&
          active.turnsSurvived >= currentMode.evolutionTurnsRequired
        ) {
          const evolvedCreature: Creature = {
            ...nextEvolution,
            currentHp: nextEvolution.maxHp,
            turnsSurvived: 0,
            isFaceUp: true,
          };

          addToLog(`${active.name} evolved into ${evolvedCreature.name}!`);

          const updatedPlayerState = {
            ...currentPlayerState,
            activeCreature: evolvedCreature,
          };

          const newState = {
            ...prev,
            player: playerType === "player" ? updatedPlayerState : prev.player,
            opponent:
              playerType === "opponent" ? updatedPlayerState : prev.opponent,
            hasRolledThisTurn: true,
            // Track evolution for corruption mechanic
            hasPlayerEvolved:
              playerType === "player" ? true : prev.hasPlayerEvolved,
            hasOpponentEvolved:
              playerType === "opponent" ? true : prev.hasOpponentEvolved,
          };

          // End the turn after evolution for both player and opponent
          setTimeout(() => {
            endTurn();
          }, 1500);

          return newState;
        } else {
          addToLog("Evolution conditions not met.");
          return prev;
        }
      });
    },
    [gameState.selectedGameMode?.id, addToLog, endTurn]
  );

  const handleModeSelection = useCallback(
    (mode: GameMode) => {
      setGameState((prev) => ({
        ...prev,
        selectedGameMode: mode,
        gamePhase: "modeSelection", // Stay in modeSelection phase
        selectionSubPhase: "chooseChallengeType", // Set new sub-phase
      }));
      addToLog(`You selected ${mode.name}. Choose your challenge.`);
    },
    [addToLog]
  );

  const handleChallengeSelection = (isEndless: boolean) => {
    setGameState((prev) => {
      const newEndlessWins = isEndless ? loadWinTally() : 0; // Load existing tally for endless, or reset for standard
      const newAiDifficulty = newEndlessWins + 1;

      return {
        ...prev,
        isEndlessModeActive: isEndless,
        endlessWins: newEndlessWins,
        aiDifficulty: newAiDifficulty,
        gamePhase: "instructions",
        selectionSubPhase: null,
      };
    });
    addToLog(
      isEndless ? "Endless Challenge selected!" : "Standard Match selected."
    );
  };

  useEffect(() => {
    console.log("AI useEffect triggered. Current state:", {
      gamePhase: gameState.gamePhase,
      turn: gameState.turn,
      isRolling: gameState.isRolling,
      isGameOver: gameState.isGameOver,
      hasRolledThisTurn: gameState.hasRolledThisTurn,
      replacementPhaseForPlayer: gameState.replacementPhaseForPlayer,
      isTaggingOut: gameState.isTaggingOut,
      needsReplacementRoll: gameState.needsReplacementRoll,
    });

    if (
      gameState.gamePhase === "inGame" &&
      gameState.turn === "opponent" &&
      !gameState.isRolling &&
      !gameState.isGameOver &&
      !gameState.hasRolledThisTurn &&
      !gameState.replacementPhaseForPlayer &&
      !gameState.isTaggingOut &&
      !gameState.needsReplacementRoll
    ) {
      console.log("AI is taking its turn!");

      // Add a delay to make AI actions feel more natural
      const aiTurnTimeout = setTimeout(() => {
        const opponentActive = gameState.opponent.activeCreature;
        const playerActive = gameState.player.activeCreature;
        const currentMode = gameState.selectedGameMode;

        if (!opponentActive || !playerActive || !currentMode) {
          console.log("Missing creatures or game mode, ending turn");
          return;
        }

        // AI logic for Set 3 (Evolution Mode)
        if (currentMode.id === "set-3") {
          const nextEvolution = getNextEvolution(opponentActive);
          if (
            nextEvolution &&
            currentMode.allowEvolution &&
            opponentActive.turnsSurvived >= currentMode.evolutionTurnsRequired
          ) {
            addToLog("Opponent attempts to evolve!");
            // Call evolution after a short delay
            setTimeout(() => handleEvolution("opponent"), 500);
            return;
          } else {
            const canTagOut = gameState.opponent.benchCreatures.some(
              (c) => c.currentHp > 0
            );
            const hasWeakness =
              opponentActive.weakness === playerActive.element;

            if (hasWeakness && canTagOut && Math.random() < 0.7) {
              // 70% chance to tag out when weak
              const viableBenchCreature =
                gameState.opponent.benchCreatures.find((c) => c.currentHp > 0);
              if (viableBenchCreature) {
                addToLog("Opponent tags out to avoid weakness!");
                // Call tag out after a short delay
                setTimeout(
                  () => handleTagOut("opponent", viableBenchCreature),
                  500
                );
                return;
              }
            }
          }
        }

        // Default action: roll dice
        addToLog("Opponent rolls the dice.");
        // Call rollDice after a short delay
        setTimeout(() => rollDice(), 500);
      }, 1000); // 1 second delay to make AI actions feel more natural

      // Cleanup timeout on unmount or dependency change
      return () => clearTimeout(aiTurnTimeout);
    }
  }, [
    gameState.gamePhase,
    gameState.turn,
    gameState.isRolling,
    gameState.isGameOver,
    gameState.hasRolledThisTurn,
    gameState.replacementPhaseForPlayer,
    gameState.isTaggingOut,
    gameState.needsReplacementRoll,
    gameState.selectedGameMode,
    gameState.opponent.activeCreature,
    gameState.player.activeCreature,
    rollDice,
    handleEvolution,
    handleTagOut,
    addToLog,
  ]);

  const initiateGameSetup = useCallback(() => {
    setGameState((prev) => ({ ...prev, gamePhase: "modeSelection" }));
    addToLog("Select a game mode to begin!");
  }, [addToLog]);

  const initializeGameRostersAndProceedToCoinToss = useCallback(
    (playerCreatureIds: string[], selectedMode: GameMode) => {
      setGameState((prev) => {
        // Always create a new instance for each creature
        const selectedPlayerCreatureInstances: Creature[] =
          playerCreatureIds.map((id) => {
            const template = getCreatureById(id);
            if (!template) throw new Error(`Creature with ID ${id} not found.`);
            const creatureMaxHp =
              selectedMode.id === "set-2"
                ? template.maxHp
                : selectedMode.startingHp;
            // Create a new instance for the player
            return createCreature(
              template.id,
              template.name,
              template.element,
              creatureMaxHp,
              template.weakness,
              template.resistance,
              template.ability,
              template.stage,
              template.evolutionLine
            );
          });

        const playerActive = {
          ...selectedPlayerCreatureInstances[0],
          isFaceUp: false,
        };
        const playerBench = selectedPlayerCreatureInstances
          .slice(1)
          .map((c) => ({ ...c, isFaceUp: false }));

        // Generate opponent creatures using the helper function
        const opponentCreatureInstances = generateOpponentCreatures(
          prev.endlessWins,
          selectedMode
        ).map((template) =>
          // Create a new instance for the opponent, even if same as player
          createCreature(
            template.id,
            template.name,
            template.element,
            selectedMode.id === "set-2"
              ? template.maxHp
              : selectedMode.startingHp,
            template.weakness,
            template.resistance,
            template.ability,
            template.stage,
            template.evolutionLine
          )
        );

        const opponentActive = {
          ...opponentCreatureInstances[0],
          isFaceUp: false,
        };
        const opponentBench = opponentCreatureInstances
          .slice(1)
          .map((c) => ({ ...c, isFaceUp: false }));

        return {
          ...prev,
          gamePhase: "coinToss",
          coinFlipResult: null, // Reset coin flip result
          player: {
            activeCreature: playerActive,
            benchCreatures: playerBench,
            skippedTurn: false,
          },
          opponent: {
            activeCreature: opponentActive,
            benchCreatures: opponentBench,
            skippedTurn: false,
          },
          playerSelectedCreatureIds: [],
          selectionSubPhase: null,
          currentElementSelection: null,
          creaturesToChooseFrom: null,
          replacementPhaseForPlayer: null,
          needsReplacementRoll: false,
          isTaggingOut: false,
          playerActiveIsAttacking: false,
          opponentActiveIsAttacking: false,
          playerActiveIsShaking: false,
          opponentActiveIsShaking: false,
          playerActiveIsDefending: false,
          opponentActiveIsDefending: false,
          selectedGameMode: selectedMode,
          damageAnimations: [],
          damagedCreatures: new Set(),
          selectedCardForDetails: null,
          isCardDetailsOpen: false,
        };
      });

      addToLog("Rosters confirmed. Flipping a coin to see who goes first...");

      setTimeout(() => {
        // Determine coin flip result
        const coinFlip = Math.random() < 0.5;
        const coinResult: "Heads" | "Tails" = coinFlip ? "Heads" : "Tails";
        const firstPlayer: "player" | "opponent" = coinFlip
          ? "player"
          : "opponent";

        // Update state with coin flip result
        setGameState((prev) => ({
          ...prev,
          coinFlipResult: coinResult,
        }));

        addToLog(
          `Coin toss result: ${coinResult}! ${
            firstPlayer === "player" ? "You" : "Opponent"
          } go first!`
        );

        // Wait a bit longer to show the result, then proceed to game
        setTimeout(() => {
          setGameState((prev) => {
            const updatedPlayerActive = prev.player.activeCreature
              ? { ...prev.player.activeCreature, isFaceUp: true }
              : null;
            const updatedPlayerBench = prev.player.benchCreatures.map((c) => ({
              ...c,
              isFaceUp: true,
            }));
            const updatedOpponentActive = prev.opponent.activeCreature
              ? { ...prev.opponent.activeCreature, isFaceUp: true }
              : null;

            return {
              ...prev,
              gamePhase: "inGame",
              turn: firstPlayer,
              hasRolledThisTurn: false,
              player: {
                ...prev.player,
                activeCreature: updatedPlayerActive,
                benchCreatures: updatedPlayerBench,
              },
              opponent: {
                ...prev.opponent,
                activeCreature: updatedOpponentActive,
              },
            };
          });
        }, 3000);
      }, 2000);
    },
    [addToLog, gameState.endlessWins] // Add endlessWins to dependency array
  );

  const handleElementSelection = useCallback(
    (element: Element) => {
      console.log(`Selected element: ${element}`);
      let creaturesForSelection: Creature[] = [];
      let nextSubPhase: GameState["selectionSubPhase"] = null;

      if (gameState.selectedGameMode?.id === "set-2") {
        creaturesForSelection = getAllLevel3Creatures().filter(
          (c) => c.element === element
        );
        nextSubPhase = "chooseSpecificCreatureForSet2";
      } else {
        // Set 3
        creaturesForSelection = getAllBasicCreatures().filter(
          (c) => c.element === element
        );
        nextSubPhase = "chooseCreature";
      }

      if (creaturesForSelection.length === 0) {
        addToLog(
          `No ${
            gameState.selectedGameMode?.id === "set-2" ? "Level 3" : "basic"
          } ${element} creatures available. Please choose another element.`
        );
        return;
      }

      setGameState((prev) => ({
        ...prev,
        currentElementSelection: element,
        selectionSubPhase: nextSubPhase,
        creaturesToChooseFrom: creaturesForSelection,
      }));
      addToLog(`You chose the ${element} element. Now pick a creature.`);
    },
    [gameState.selectedGameMode, addToLog]
  );

  const proceedFromInstructions = useCallback(() => {
    if (!gameState.selectedGameMode) {
      addToLog("Error: Game mode not selected.");
      return;
    }

    setGameState((prev) => ({
      ...prev,
      gamePhase: "creatureSelection",
      selectionSubPhase: "chooseElement",
    }));

    const creatureText =
      gameState.selectedGameMode.playerCreatureCount > 1
        ? "creatures"
        : "creature";
    addToLog(`Now choose your ${creatureText} for battle!`);
  }, [gameState.selectedGameMode, addToLog]);

  // New handler for Set 2 creature selection
  const handleFinalSet2CreatureSelection = useCallback(
    (creatureId: string) => {
      if (gameState.selectedGameMode?.id !== "set-2") return;

      const selectedCreature = getCreatureById(creatureId);
      if (!selectedCreature) {
        addToLog("Error: Selected creature not found.");
        return;
      }

      initializeGameRostersAndProceedToCoinToss(
        [creatureId],
        gameState.selectedGameMode
      );
      addToLog(`Selected ${selectedCreature.name} for Set 2.`);
    },
    [
      gameState.selectedGameMode,
      addToLog,
      initializeGameRostersAndProceedToCoinToss,
    ]
  );

  const handleCreatureSelection = useCallback(
    (creatureId: string) => {
      // This function is only for Set 3 (multi-creature selection)
      if (gameState.selectedGameMode?.id === "set-2") return;

      setGameState((prev) => {
        const currentSelection = [...prev.playerSelectedCreatureIds];
        const selectedCreature = getCreatureById(creatureId);
        const maxCreatures = prev.selectedGameMode?.playerCreatureCount || 3;

        if (!selectedCreature) {
          addToLog("Error: Creature not found.");
          return prev;
        }

        if (currentSelection.includes(creatureId)) {
          addToLog(`${selectedCreature.name} is already in your roster.`);
          return prev;
        }

        if (currentSelection.length < maxCreatures) {
          currentSelection.push(creatureId);
          addToLog(
            `Added ${selectedCreature.name} (${selectedCreature.element}) to your roster.`
          );
        } else {
          addToLog(
            `Your roster is full (${maxCreatures} creatures selected). Remove one to add another.`
          );
        }

        const nextSubPhase =
          currentSelection.length < maxCreatures ? "chooseElement" : null;
        return {
          ...prev,
          playerSelectedCreatureIds: currentSelection,
          currentElementSelection:
            nextSubPhase === "chooseElement"
              ? null
              : prev.currentElementSelection,
          selectionSubPhase: nextSubPhase,
        };
      });
    },
    [addToLog]
  );

  const handleRemoveSelectedCreature = useCallback(
    (indexToRemove: number) => {
      // This function is only for Set 3 (multi-creature selection)
      if (gameState.selectedGameMode?.id === "set-2") return;

      setGameState((prev) => {
        const currentSelection = [...prev.playerSelectedCreatureIds];
        if (indexToRemove >= 0 && indexToRemove < currentSelection.length) {
          const removedCreatureId = currentSelection[indexToRemove];
          currentSelection.splice(indexToRemove, 1);
          addToLog(
            `Removed ${
              getCreatureById(removedCreatureId)?.name
            } from your roster.`
          );
        }
        const maxCreatures = prev.selectedGameMode?.playerCreatureCount || 3;
        const nextSubPhase =
          currentSelection.length < maxCreatures ? "chooseElement" : null;

        return {
          ...prev,
          playerSelectedCreatureIds: currentSelection,
          selectionSubPhase: nextSubPhase,
          currentElementSelection: null,
        };
      });
    },
    [addToLog]
  );

  const handlePlayerReplacementSelection = useCallback(
    (creature: Creature) => {
      if (gameState.selectedGameMode?.id !== "set-3") return; // Replacement only allowed in Set 3
      setGameState((prev) => {
        if (prev.replacementPhaseForPlayer !== "player") return prev;

        const newStateAfterReplacement = handleCreatureReplacementLogic(
          prev,
          "player",
          creature
        );
        addToLog(`Player replaced with ${creature.name}.`);

        // After replacement, mark as rolled for this turn and exit replacement phase.
        // The turn will then end immediately.
        return {
          ...newStateAfterReplacement,
          hasRolledThisTurn: false, // Allow player to roll after replacement
          replacementPhaseForPlayer: null, // Exit replacement phase
        };
      });
      // End the turn after a short delay to allow state update to process
      setTimeout(() => {
        endTurn();
      }, 100);
    },
    [
      gameState.selectedGameMode?.id,
      addToLog,
      handleCreatureReplacementLogic,
      endTurn,
    ]
  );

  const confirmRosterSelection = useCallback(() => {
    // This function is only for Set 3 (multi-creature selection)
    if (gameState.selectedGameMode?.id !== "set-3") return;

    const maxCreatures = gameState.selectedGameMode?.playerCreatureCount || 3;
    if (gameState.playerSelectedCreatureIds.length !== maxCreatures) {
      addToLog(`Please select exactly ${maxCreatures} creatures.`);
      return;
    }
    if (!gameState.selectedGameMode) {
      addToLog("Error: Game mode not selected.");
      return;
    }

    initializeGameRostersAndProceedToCoinToss(
      gameState.playerSelectedCreatureIds,
      gameState.selectedGameMode
    );
  }, [
    gameState.playerSelectedCreatureIds,
    gameState.selectedGameMode,
    addToLog,
    initializeGameRostersAndProceedToCoinToss,
  ]);

  const playerActiveCreature = gameState.player.activeCreature;
  const opponentActiveCreature = gameState.opponent.activeCreature;

  const canPlayerEvolve =
    playerActiveCreature &&
    gameState.selectedGameMode?.allowEvolution &&
    playerActiveCreature.turnsSurvived >=
      (gameState.selectedGameMode?.evolutionTurnsRequired || 3) &&
    gameState.turn === "player" &&
    !gameState.isRolling &&
    !gameState.isGameOver &&
    !gameState.hasRolledThisTurn &&
    !gameState.replacementPhaseForPlayer &&
    !gameState.isTaggingOut;

  const canPlayerTagOut =
    gameState.player.benchCreatures.some((c) => c.currentHp > 0) &&
    gameState.turn === "player" &&
    !gameState.isRolling &&
    !gameState.isGameOver &&
    !gameState.hasRolledThisTurn &&
    !gameState.replacementPhaseForPlayer &&
    !gameState.isTaggingOut &&
    gameState.selectedGameMode?.id === "set-3"; // Only allow tag out in Set 3

  const selectedCreatureInstancesForDisplay =
    gameState.playerSelectedCreatureIds
      .map((id) => getCreatureById(id))
      .filter(Boolean) as Creature[];

  const elementCounts: Record<Element, number> = {
    Fire: 0,
    Water: 0,
    Earth: 0,
    Air: 0,
  };
  selectedCreatureInstancesForDisplay.forEach((c) => {
    elementCounts[c.element]++;
  });

  const elementalTypes: Element[] = ["Fire", "Water", "Earth", "Air"];

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
      if (damageTimerRef.current) clearTimeout(damageTimerRef.current);
      if (endTurnTimerRef.current) clearTimeout(endTurnTimerRef.current);
    };
  }, [rollTimerRef, damageTimerRef, endTurnTimerRef]); // Add refs to dependency array for cleanup

  return (
    <>
      {gameState.isEndlessModeActive && gameState.gamePhase === "inGame" && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/20 shadow-lg">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <span className="font-bold text-lg">{gameState.endlessWins}</span>
        </div>
      )}
      <div
        className={cn(
          "min-h-screen p-2 sm:p-4 relative flex items-center justify-center bg-black",
          gameState.replacementPhaseForPlayer &&
            "opacity-30 pointer-events-none" // Dim and disable interaction
        )}>
        {gameState.gamePhase === "setup" && (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white p-4 text-center z-20">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">
              🌍
              <br />
              Welcome to Elementara
              <br />
              🔥💧🌱🌬️
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl max-w-2xl mb-8 leading-relaxed">
              In a world where elemental creatures clash in epic dice-driven
              battles, only the clever, the bold, and the lucky will rise.
            </p>
            <p className="text-xl sm:text-2xl md:text-2xl font-semibold mb-12">
              Choose your team. Roll the dice. Master the elements.
            </p>
            <p className="text-md sm:text-lg md:text-xl text-white/80 mb-12">
              No decks. No gimmicks. Just raw strategy and elemental fury.
            </p>
            <Button
              onClick={initiateGameSetup}
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105">
              Start Game
            </Button>
          </div>
        )}

        {/* Hamburger Menu - Top Right */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 text-black border-2 border-gray-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
            aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg flex flex-col p-4 gap-4 z-50">
              {/* <button
                onClick={() => {
                  setMenuOpen(false);
                  // Open How To Play modal or navigate
                  setGameState((prev) => ({
                    ...prev,
                    isAchievementsOpen: true,
                  })); // Replace with your How To Play logic
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition">
                How To Play
              </button> */}

              {gameState.selectedGameMode && !gameState.isGameOver && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleBackToMenu(); // Call your back to menu handler
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition">
                  Back to Main Menu
                </button>
              )}
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            {/* Opponent Bench - Top */}
            {gameState.selectedGameMode?.id === "set-3" && // Only show bench for Set 3
              (gameState.gamePhase === "inGame" ||
                gameState.gamePhase === "gameOver") && (
                <div className="flex gap-4">
                  {gameState.opponent.benchCreatures.map((creature, index) => (
                    <div key={`${creature.id}-${index}`} className="relative">
                      <ArenaSlot
                        label={`Opp Bench ${index + 1}`}
                        isOpponent
                        creature={creature}
                        isActive={false}
                        isDamaged={
                          playerActiveCreature
                            ? gameState.damagedCreatures.has(
                                playerActiveCreature.instanceId
                              )
                            : false
                        }
                        gameMode={gameState.selectedGameMode?.id}
                        onSlotClick={() => {
                          if (
                            gameState.gamePhase === "inGame" &&
                            gameState.turn === "player"
                          ) {
                            addToLog(
                              "You cannot interact with opponent's creatures."
                            );
                          }
                        }}
                      />
                      {/* Enhanced Damage Animation for Opponent Bench */}
                      {gameState.damageAnimations
                        .filter(
                          (anim) => anim.creatureId === creature.instanceId
                        )
                        .map((anim) => (
                          <div
                            key={anim.timestamp}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                            <div className="text-red-500 font-bold text-2xl sm:text-3xl md:text-4xl animate-damage-float drop-shadow-lg">
                              -{anim.damage}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}

            {/* Opponent Active - Below bench */}
            {(gameState.gamePhase === "inGame" ||
              gameState.gamePhase === "gameOver") && (
              <div className="relative">
                <ArenaSlot
                  label="Opponent Active"
                  isActive={gameState.turn === "opponent"}
                  isOpponent
                  creature={opponentActiveCreature}
                  isAttacking={gameState.opponentActiveIsAttacking}
                  isShaking={gameState.opponentActiveIsShaking}
                  isDefending={gameState.opponentActiveIsDefending}
                  isDamaged={
                    playerActiveCreature
                      ? gameState.damagedCreatures.has(
                          playerActiveCreature.instanceId
                        )
                      : false
                  }
                  isCorrupted={
                    gameState.isCorrupted &&
                    gameState.corruptedPlayer === "opponent"
                  }
                  gameMode={gameState.selectedGameMode?.id}
                  onSlotClick={() => {
                    if (
                      gameState.gamePhase === "inGame" &&
                      gameState.turn === "player"
                    ) {
                      addToLog(
                        "You cannot interact with opponent's creatures."
                      );
                    }
                  }}
                />
                {/* Enhanced Damage Animation for Opponent Active */}
                {opponentActiveCreature &&
                  gameState.damageAnimations
                    .filter(
                      (anim) => anim.creatureId === opponentActiveCreature.id
                    )
                    .map((anim) => (
                      <div
                        key={anim.timestamp}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="text-red-500 font-bold text-3xl sm:text-4xl md:text-5xl animate-damage-float drop-shadow-lg">
                          -{anim.damage}
                        </div>
                      </div>
                    ))}
              </div>
            )}

            {/* Center Content - Dice and Game Controls */}
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-4 mx-0 my-0 sm:py-6">
                {gameState.gamePhase === "modeSelection" && (
                  <div className="flex flex-col items-center gap-4 w-full">
                    {gameState.selectionSubPhase === "chooseChallengeType" &&
                    gameState.selectedGameMode ? (
                      <div className="flex flex-col items-center gap-4 w-full max-w-xs text-center">
                        <h4 className="text-white text-2xl font-bold mb-2">
                          {gameState.selectedGameMode.name}
                        </h4>
                        <Button
                          onClick={() => handleChallengeSelection(false)}
                          variant="outline"
                          className="w-full flex flex-col items-center justify-center p-4 h-auto text-black border-white/30 hover:bg-white/30 group">
                          <span className="text-xl font-bold mb-1 group-hover:text-white">
                            Standard Match
                          </span>
                          <span className="text-sm text-black text-center group-hover:text-white">
                            A single battle for glory.
                          </span>
                        </Button>
                        <Button
                          onClick={() => handleChallengeSelection(true)}
                          variant="outline"
                          className="w-full flex flex-col items-center justify-center p-4 h-auto text-black border-white/30 hover:bg-white/30 group">
                          <span className="text-xl font-bold mb-1 group-hover:text-white">
                            Endless Challenge
                          </span>
                          <span className="text-sm text-black text-center group-hover:text-white flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            Record:{" "}
                            {gameState.endlessTrophies[
                              gameState.selectedGameMode.id
                            ] || 0}{" "}
                            wins
                          </span>
                        </Button>
                        <Button
                          onClick={() =>
                            setGameState((prev) => ({
                              ...prev,
                              selectionSubPhase: null,
                              selectedGameMode: null,
                            }))
                          }
                          variant="ghost"
                          className="text-white/70 hover:text-foreground mt-2">
                          Back to Mode Selection
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-white text-lg font-semibold text-center">
                          Select a Game Mode:
                        </h4>
                        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                          {gameModes.map((mode) => (
                            <Button
                              key={mode.id}
                              onClick={() => handleModeSelection(mode)}
                              variant="outline"
                              className="flex flex-col items-center justify-center p-4 h-auto text-black border-white/30 hover:bg-white/30 group">
                              <span className="text-xl font-bold mb-1 group-hover:text-white">
                                {mode.name}
                              </span>
                              <span className="text-sm text-black text-center group-hover:text-white">
                                {mode.description}
                              </span>
                            </Button>
                          ))}
                        </div>
                        <Button
                          onClick={openAchievements}
                          variant="ghost"
                          className="text-white/70 hover:text-foreground mt-4 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                          View Achievements
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {gameState.gamePhase === "creatureSelection" && (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <h4 className="text-white text-lg font-semibold text-center">
                      🔥🌊🌱🌬️
                      <br />
                      Awaken Your First Elementara (
                      {gameState.playerSelectedCreatureIds.length}/
                      {gameState.selectedGameMode?.playerCreatureCount || 3})
                    </h4>
                    <p className="text-white/80 text-sm text-center">
                      {gameState.selectedGameMode?.id === "set-2"
                        ? "Select one elemental type to summon your Stage 3 Elementara for a 1v1 clash of power and spirit."
                        : "The element of your first chosen creature will become your Active Element in battle. Choose wisely."}
                    </p>

                    {/* Your Roster Preview (only for Set 3 mode) */}
                    {gameState.selectedGameMode?.id === "set-3" && (
                      <div className="w-full bg-white/10 p-3 rounded-lg border border-white/20">
                        <h5 className="text-white text-md font-semibold mb-2">
                          Your Roster:
                        </h5>
                        {selectedCreatureInstancesForDisplay.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-4">
                            {selectedCreatureInstancesForDisplay.map(
                              (creature, index) => (
                                <div key={index} className="relative">
                                  <CreatureCard
                                    creature={creature}
                                    onClick={() =>
                                      handleCardDetailView(creature)
                                    } // Allow opening details from roster
                                    gameMode={gameState.selectedGameMode?.id}
                                    className={cn(
                                      "w-12 h-16 xs:w-14 xs:h-18 sm:w-16 sm:h-20 md:w-20 md:h-24",
                                      index === 0 &&
                                        "ring-1 sm:ring-2 ring-yellow-400 border-yellow-400",
                                      index !== 0 &&
                                        "ring-1 ring-blue-400 border-blue-400"
                                    )}
                                  />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:h-6 rounded-full text-white bg-red-600 hover:bg-red-700 text-xs flex items-center justify-center"
                                    onClick={() =>
                                      handleRemoveSelectedCreature(index)
                                    }>
                                    <span className="text-white text-xs sm:text-sm leading-none">
                                      ✕
                                    </span>
                                    <span className="sr-only">
                                      Remove {creature.name}
                                    </span>
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-white/60 text-sm text-center">
                            No creatures selected yet.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dynamic Selection Area */}
                    {/* Show element selection if in chooseElement phase */}
                    {gameState.selectionSubPhase === "chooseElement" && (
                      <div className="flex flex-col items-center gap-4 mt-4">
                        <h5 className="text-white text-md font-semibold">
                          Select an Element:
                        </h5>
                        <div className="grid grid-cols-4 gap-4">
                          {elementalTypes.map((element) => {
                            const ElementEmoji = elementEmojis[element];
                            return (
                              <Button
                                key={element}
                                onClick={() => handleElementSelection(element)}
                                variant="outline"
                                className={cn(
                                  "flex flex-col items-center justify-center p-4 h-auto",
                                  "text-black border-white/30 hover:bg-white/30 group" // Added 'group' class
                                )}>
                                <span className="text-4xl mb-2">
                                  {ElementEmoji}
                                </span>
                                <span className="text-sm font-bold text-black group-hover:text-white">
                                  {element}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Only show specific creature selection if Set 2 and in chooseSpecificCreatureForSet2 phase */}
                    {gameState.selectedGameMode?.id === "set-2" &&
                      gameState.selectionSubPhase ===
                        "chooseSpecificCreatureForSet2" &&
                      gameState.creaturesToChooseFrom && (
                        <div className="flex flex-col items-center gap-4 mt-4">
                          <h5 className="text-white text-md font-semibold">
                            Choose your Level 3{" "}
                            {gameState.currentElementSelection} Creature:
                          </h5>
                          <div className="grid grid-cols-3 gap-4">
                            {gameState.creaturesToChooseFrom.map((creature) => (
                              <CreatureCard
                                key={creature.id}
                                creature={creature}
                                onClick={() => {
                                  if (
                                    gameState.gamePhase === "creatureSelection"
                                  ) {
                                    handleFinalSet2CreatureSelection(
                                      creature.id
                                    );
                                  } else {
                                    handleCardDetailView(creature);
                                  }
                                }}
                                gameMode={gameState.selectedGameMode?.id}
                                className="cursor-pointer"
                              />
                            ))}
                          </div>
                          <Button
                            onClick={() =>
                              setGameState((prev) => ({
                                ...prev,
                                selectionSubPhase: "chooseElement",
                                currentElementSelection: null,
                                creaturesToChooseFrom: null,
                              }))
                            }
                            variant="outline"
                            className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500 hover:text-foreground">
                            Back to Element Selection
                          </Button>
                        </div>
                      )}

                    {/* Only show creature selection if Set 3 and in chooseCreature phase */}
                    {gameState.selectedGameMode?.id === "set-3" &&
                      gameState.selectionSubPhase === "chooseCreature" && (
                        <div className="flex flex-col items-center gap-4 mt-4">
                          <h5 className="text-white text-md font-semibold">
                            Choose a {gameState.currentElementSelection}{" "}
                            Creature:
                          </h5>
                          <div className="grid grid-cols-3 gap-4">
                            {gameState.currentElementSelection
                              ? getAllBasicCreatures()
                                  .filter((creature) => {
                                    const isAlreadySelectedById =
                                      gameState.playerSelectedCreatureIds.includes(
                                        creature.id
                                      );
                                    return (
                                      creature.element ===
                                        gameState.currentElementSelection &&
                                      !isAlreadySelectedById
                                    );
                                  })
                                  .map((creature) => (
                                    <CreatureCard
                                      key={creature.id}
                                      creature={creature}
                                      onClick={() => {
                                        if (
                                          gameState.gamePhase ===
                                          "creatureSelection"
                                        ) {
                                          handleCreatureSelection(creature.id);
                                        } else {
                                          handleCardDetailView(creature);
                                        }
                                      }}
                                      gameMode={gameState.selectedGameMode?.id}
                                      className="cursor-pointer"
                                    />
                                  ))
                              : null}
                          </div>
                          <Button
                            onClick={() =>
                              setGameState((prev) => ({
                                ...prev,
                                selectionSubPhase: "chooseElement",
                                currentElementSelection: null,
                              }))
                            }
                            variant="outline"
                            className="bg-gray-600 hover:bg-gray-700 text-white border-gray-500 hover:text-foreground">
                            Back to Element Selection
                          </Button>
                        </div>
                      )}

                    {/* Only show Confirm Roster button if Set 3 */}
                    {gameState.selectedGameMode?.id === "set-3" && (
                      <Button
                        onClick={confirmRosterSelection}
                        disabled={
                          gameState.playerSelectedCreatureIds.length !==
                          (gameState.selectedGameMode?.playerCreatureCount || 3)
                        }
                        className="bg-green-600 hover:bg-green-700 text-white">
                        Confirm Roster
                      </Button>
                    )}
                  </div>
                )}

                {gameState.gamePhase === "instructions" && (
                  <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
                      {gameState.selectedGameMode?.id === "set-2"
                        ? "Full Power Duel"
                        : "Evolution Clash"}
                    </h2>

                    <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6 sm:p-8 space-y-4">
                      <div className="text-white text-lg sm:text-xl leading-relaxed space-y-4 text-left">
                        {gameState.selectedGameMode?.id === "set-2" ? (
                          <>
                            <p className="text-xl sm:text-2xl font-semibold mb-4">
                              Choose one Stage 3 Elementara. Battle at peak
                              power.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🐉 Start with a fully evolved creature.
                            </p>

                            <p className="text-lg sm:text-xl">
                              📊 Use full HP stats, resistances, and weaknesses.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🎲 Roll 1 die each turn to deal damage.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🏆 First to reduce the opponent's HP to 0 wins.
                            </p>

                            <p className="text-lg sm:text-xl font-semibold mt-6">
                              ⚡ Experience the full power of evolved
                              Elementara!
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl sm:text-2xl font-semibold mb-4">
                              Choose a full evolution line. Battle through all 3
                              stages.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🥚 Start with your Stage 1 creature.
                            </p>

                            <p className="text-lg sm:text-xl">
                              ⚡ Evolve mid-battle to unlock buffs.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🔄 Tag between creatures at any time.
                            </p>

                            <p className="text-lg sm:text-xl">
                              📊 Use HP, resistances, and weaknesses.
                            </p>

                            <p className="text-lg sm:text-xl">
                              🏆 Last creature standing wins.
                            </p>

                            <p className="text-lg sm:text-xl font-semibold mt-6">
                              🧠 Master the art of evolution and strategy!
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={proceedFromInstructions}
                      className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 mt-4">
                      {gameState.selectedGameMode?.id === "set-2"
                        ? "Begin Full Power Battle"
                        : "Begin Evolution Clash"}
                    </Button>
                  </div>
                )}

                {gameState.gamePhase === "coinToss" && (
                  <div className="flex flex-col items-center text-white text-xl font-bold gap-4">
                    <div className="relative">
                      <div
                        className={cn(
                          "text-8xl sm:text-9xl drop-shadow-2xl",
                          !gameState.coinFlipResult && "animate-coin-flip"
                        )}>
                        🪙
                      </div>
                      <div
                        className={cn(
                          "absolute inset-0 text-8xl sm:text-9xl opacity-30",
                          !gameState.coinFlipResult && "animate-coin-bounce"
                        )}>
                        ✨
                      </div>
                    </div>
                    {!gameState.coinFlipResult ? (
                      <div className="text-lg sm:text-xl font-bold text-yellow-400 animate-pulse">
                        Flipping Coin...
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl sm:text-5xl font-extrabold text-yellow-400 animate-bounce drop-shadow-lg">
                          {gameState.coinFlipResult}!
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-400">
                          {gameState.coinFlipResult === "Heads"
                            ? "You start first!"
                            : "Opponent starts first!"}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {gameState.gamePhase === "inGame" &&
                  !gameState.replacementPhaseForPlayer && (
                    <div className="flex flex-col items-center gap-4">
                      <DiceComponent
                        value={gameState.diceValue}
                        isRolling={gameState.isRolling}
                        isCorrupted={gameState.isCorrupted}
                        gameMode={gameState.selectedGameMode?.id}
                        isCriticalMiss={gameState.isCriticalMiss}
                        isCriticalHit={gameState.isCriticalHit}
                      />
                      {/* Corruption Status Indicator - only show in Evolution Mode */}
                      {gameState.isCorrupted &&
                        gameState.selectedGameMode?.id === "set-3" && (
                          <div className="absolute top-8 z-50 flex flex-col items-center gap-2 w-50">
                            <div className="bg-purple-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500 w-full">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">🌀</span>
                                <span className="text-white font-bold text-center">
                                  CORRUPTED DIE
                                </span>
                                <span className="text-2xl">🌀</span>
                              </div>
                              {/* <div className="text-center text-purple-200 text-sm mt-1">
                                {gameState.corruptedTurnsRemaining} turns
                                remaining
                              </div> */}
                              {gameState.corruptedPlayer && (
                                <div className="text-center text-purple-300 text-xs mt-1">
                                  {gameState.corruptedPlayer === "player"
                                    ? "Your creature"
                                    : "Opponent's creature"}{" "}
                                  is empowered!
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
              </div>
            </div>

            {/* Player Active (closer to center) */}
            {(gameState.gamePhase === "inGame" ||
              gameState.gamePhase === "gameOver") && (
              <div className="relative">
                <ArenaSlot
                  label="Your Active"
                  isActive={gameState.turn === "player"}
                  creature={playerActiveCreature}
                  isAttacking={gameState.playerActiveIsAttacking}
                  isShaking={gameState.playerActiveIsShaking}
                  isDefending={gameState.playerActiveIsDefending}
                  isDamaged={
                    playerActiveCreature
                      ? gameState.damagedCreatures.has(
                          playerActiveCreature.instanceId
                        )
                      : false
                  }
                  isCorrupted={
                    gameState.isCorrupted &&
                    gameState.corruptedPlayer === "player"
                  }
                  gameMode={gameState.selectedGameMode?.id}
                  onSlotClick={() => {
                    if (
                      gameState.gamePhase === "inGame" &&
                      gameState.turn === "player"
                    ) {
                      addToLog(
                        "You cannot interact with your active creature directly."
                      );
                    }
                  }}
                />
                {/* Enhanced Damage Animation for Player Active */}
                {playerActiveCreature &&
                  gameState.damageAnimations
                    .filter(
                      (anim) =>
                        anim.creatureId === playerActiveCreature.instanceId
                    )
                    .map((anim) => (
                      <div
                        key={anim.timestamp}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="text-red-500 font-bold text-3xl sm:text-4xl md:text-5xl animate-damage-float drop-shadow-lg">
                          -{anim.damage}
                        </div>
                      </div>
                    ))}
              </div>
            )}
            {/* Player Bench (further away from center) */}
            {gameState.selectedGameMode?.id === "set-3" && // Only show bench for Set 3
              (gameState.gamePhase === "inGame" ||
                gameState.gamePhase === "gameOver") && (
                <div className="flex gap-4">
                  {gameState.player.benchCreatures.map((creature, index) => (
                    <div key={`${creature.id}-${index}`} className="relative">
                      <ArenaSlot
                        label={`Your Bench ${index + 1}`}
                        creature={creature}
                        isActive={
                          gameState.turn === "player" && gameState.isTaggingOut
                        }
                        isDamaged={
                          playerActiveCreature
                            ? gameState.damagedCreatures.has(
                                playerActiveCreature.instanceId
                              )
                            : false
                        }
                        gameMode={gameState.selectedGameMode?.id}
                        onSlotClick={() => {
                          if (
                            gameState.gamePhase === "inGame" &&
                            gameState.turn === "player" &&
                            creature.currentHp > 0 &&
                            gameState.isTaggingOut
                          ) {
                            handleTagOut("player", creature);
                          } else if (creature.currentHp <= 0) {
                            addToLog(
                              "This creature is knocked out and cannot be tagged in."
                            );
                          } else if (gameState.gamePhase !== "inGame") {
                            addToLog("The game hasn't started yet.");
                          } else if (gameState.turn !== "player") {
                            addToLog("It's not your turn.");
                          } else if (gameState.isTaggingOut) {
                            addToLog(
                              "Click a benched creature to tag out with it."
                            );
                          } else if (gameState.replacementPhaseForPlayer) {
                            addToLog(
                              "You must select a replacement for your knocked out creature."
                            );
                          }
                        }}
                      />
                      {/* Enhanced Damage Animation for Player Bench */}
                      {gameState.damageAnimations
                        .filter(
                          (anim) => anim.creatureId === creature.instanceId
                        )
                        .map((anim) => (
                          <div
                            key={anim.timestamp}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                            <div className="text-red-500 font-bold text-2xl sm:text-3xl md:text-4xl animate-damage-float drop-shadow-lg">
                              -{anim.damage}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Game Over Screen Overlay */}
        {gameState.isGameOver && (
          <div
            className={cn(
              "fixed inset-0 flex flex-col items-center justify-center z-[100] transition-all duration-500",
              gameState.winner === "opponent" ? "bg-black/70" : "bg-blue-900/70"
            )}>
            <h2
              className={cn(
                "text-6xl sm:text-8xl font-extrabold text-white text-center drop-shadow-lg",
                gameState.winner === "player"
                  ? "text-green-600"
                  : "text-red-600"
              )}>
              {gameState.winner === "player" ? "You Win!" : "You Lose!"}
            </h2>
            {gameState.isEndlessModeActive &&
              gameState.winner === "opponent" && (
                <p className="text-2xl sm:text-3xl text-white mt-4">
                  Final Score:{" "}
                  <span className="font-bold text-yellow-400">
                    {gameState.finalEndlessScore ?? gameState.endlessWins}
                  </span>{" "}
                  wins
                </p>
              )}
            <div className="flex gap-4 mt-8">
              <Button
                onClick={handleRestartCurrentMode}
                size="lg"
                className={cn(
                  "bg-green-600 hover:bg-green-700",
                  "text-white font-semibold shadow-2xl border-2 border-green-500/50",
                  "transition-all duration-200 hover:scale-105 hover:shadow-green-500/25",
                  "text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3",
                  "z-[101]"
                )}>
                Restart
              </Button>
              <Button
                onClick={handleBackToMenu}
                size="lg"
                className={cn(
                  "bg-green-600 hover:bg-green-700",
                  "text-white font-semibold shadow-2xl border-2 border-green-500/50",
                  "transition-all duration-200 hover:scale-105 hover:shadow-green-500/25",
                  "text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3",
                  "z-[101]"
                )}>
                Back to Menu
              </Button>
            </div>
          </div>
        )}

        {/* Card Details Modal */}
        {gameState.isCardDetailsOpen && gameState.selectedCardForDetails && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {/* Close button */}
              <Button
                onClick={closeCardDetails}
                size="icon"
                className="absolute top-4 right-4 z-[201] w-12 h-12 rounded-full bg-white hover:bg-gray-100 text-black border-2 border-gray-200 shadow-lg transition-all duration-200 hover:scale-105">
                <span className="text-xl text-black">✕</span>
                <span className="sr-only">Close Card Details</span>
              </Button>

              {/* Enlarged Card */}
              <div className="animate-card-flip-and-scale">
                <div className="w-80 h-96 sm:w-96 sm:h-[28rem] md:w-[28rem] md:h-[36rem] bg-white rounded-xl shadow-2xl border-4 border-gray-300 overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sm:p-6">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2">
                      {gameState.selectedCardForDetails.name}
                    </h2>
                    <div className="flex justify-center items-center gap-2">
                      <span className="text-4xl sm:text-5xl md:text-6xl">
                        {
                          elementEmojis[
                            gameState.selectedCardForDetails.element
                          ]
                        }
                      </span>
                      <span className="text-lg sm:text-xl md:text-2xl font-semibold">
                        {gameState.selectedCardForDetails.element}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-gradient-to-b from-white to-gray-50">
                    {/* Stage */}
                    <div className="text-center">
                      <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm sm:text-base font-medium">
                        {gameState.selectedCardForDetails.stage}
                      </span>
                    </div>

                    {/* HP Stats */}
                    <div className="bg-red-50 rounded-lg p-3 sm:p-4 border-2 border-red-200">
                      <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-2 text-center">
                        Health Points
                      </h3>
                      <div className="flex justify-between items-center">
                        <span className="text-base sm:text-lg font-medium text-gray-700">
                          Current HP:
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-red-600">
                          {gameState.selectedCardForDetails.currentHp}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-base sm:text-lg font-medium text-gray-700">
                          Max HP:
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-red-800">
                          {gameState.selectedCardForDetails.maxHp}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-300 rounded-full h-3 sm:h-4">
                          <div
                            className="bg-red-500 h-3 sm:h-4 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                (gameState.selectedCardForDetails.currentHp /
                                  gameState.selectedCardForDetails.maxHp) *
                                100
                              }%`,
                            }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Weaknesses and Resistances */}
                    {(gameState.selectedCardForDetails.weakness ||
                      gameState.selectedCardForDetails.resistance) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {gameState.selectedCardForDetails.weakness && (
                          <div className="bg-orange-50 rounded-lg p-3 border-2 border-orange-200">
                            <h4 className="text-sm sm:text-base font-bold text-orange-700 mb-1 text-center">
                              Weakness
                            </h4>
                            <div className="flex justify-center items-center gap-1">
                              <span className="text-2xl sm:text-3xl">
                                {
                                  elementEmojis[
                                    gameState.selectedCardForDetails.weakness
                                  ]
                                }
                              </span>
                              <span className="text-sm sm:text-base font-medium text-orange-600">
                                {gameState.selectedCardForDetails.weakness}
                              </span>
                            </div>
                          </div>
                        )}
                        {gameState.selectedCardForDetails.resistance && (
                          <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                            <h4 className="text-sm sm:text-base font-bold text-green-700 mb-1 text-center">
                              Resistance
                            </h4>
                            <div className="flex justify-center items-center gap-1">
                              <span className="text-2xl sm:text-3xl">
                                {
                                  elementEmojis[
                                    gameState.selectedCardForDetails.resistance
                                  ]
                                }
                              </span>
                              <span className="text-sm sm:text-base font-medium text-green-600">
                                {gameState.selectedCardForDetails.resistance}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ability */}
                    {gameState.selectedCardForDetails.ability && (
                      <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border-2 border-purple-200">
                        <h4 className="text-base sm:text-lg font-bold text-purple-700 mb-2 text-center">
                          Special Ability
                        </h4>
                        <p className="text-sm sm:text-base text-purple-600 text-center font-medium">
                          {gameState.selectedCardForDetails.ability}
                        </p>
                      </div>
                    )}

                    {/* Evolution Line */}
                    {gameState.selectedCardForDetails.evolutionLine && (
                      <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-2 border-blue-200">
                        <h4 className="text-base sm:text-lg font-bold text-blue-700 mb-2 text-center">
                          Evolution Line
                        </h4>
                        <p className="text-sm sm:text-base text-blue-600 text-center font-medium">
                          {gameState.selectedCardForDetails.evolutionLine}
                        </p>
                      </div>
                    )}

                    {/* Battle Stats */}
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200">
                      <h4 className="text-base sm:text-lg font-bold text-gray-700 mb-2 text-center">
                        Battle Stats
                      </h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm sm:text-base font-medium text-gray-600">
                          Turns Survived:
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-gray-800">
                          {gameState.selectedCardForDetails.turnsSurvived || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Modal */}
        {gameState.isAchievementsOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in-0"
            onClick={closeAchievements}>
            <div
              className="relative w-full max-w-md bg-gray-900/70 border border-white/20 rounded-xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}>
              <button
                onClick={closeAchievements}
                className="absolute -top-3 -right-3 z-10 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border-2 border-white/50"
                title="Close">
                <span className="text-xl font-bold">✕</span>
              </button>
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6 flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
                Achievements
              </h2>
              <p className="text-center text-white/80 mb-8">
                Your best scores in Endless Challenge mode.
              </p>
              <div className="mt-4">
                <table className="w-full text-white">
                  <thead className="sr-only">
                    <tr>
                      <th className="text-left p-2">Game Mode</th>
                      <th className="text-right p-2">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameModes.map((mode) => (
                      <tr
                        key={mode.id}
                        className="border-b border-white/10 last:border-b-0">
                        <td className="py-3 sm:py-4 text-base sm:text-lg font-semibold">
                          {mode.name}
                        </td>
                        <td className="py-3 sm:py-4">
                          <div className="flex items-center justify-end gap-2 sm:gap-3">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                            <span className="font-bold text-xl sm:text-2xl w-10 text-center">
                              {gameState.endlessTrophies[mode.id] || 0}
                            </span>
                            <span className="text-white/70 text-sm sm:text-base">
                              wins
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {gameState.gamePhase === "inGame" &&
        !gameState.replacementPhaseForPlayer && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/70 backdrop-blur-sm flex justify-center items-center">
            <div className="flex gap-3 w-full max-w-md">
              {gameState.selectedGameMode?.id === "set-3" && (
                <Button
                  onClick={() =>
                    setGameState((prev) => ({ ...prev, isTaggingOut: true }))
                  }
                  disabled={
                    !canPlayerTagOut ||
                    gameState.isRolling ||
                    gameState.turn !== "player"
                  }
                  variant="default"
                  className="flex-1 bg-white text-black hover:bg-gray-100 text-lg px-6 py-3 rounded-md">
                  Tag
                </Button>
              )}
              <Button
                onClick={rollDice} // Always call rollDice now
                disabled={
                  gameState.hasRolledThisTurn ||
                  gameState.isRolling ||
                  gameState.turn !== "player"
                }
                variant="default"
                className="flex-1 bg-white text-black hover:bg-gray-100 text-lg px-6 py-3 rounded-md">
                Roll
              </Button>
              {gameState.selectedGameMode?.id === "set-3" && (
                <Button
                  onClick={() => handleEvolution("player")}
                  disabled={
                    !canPlayerEvolve ||
                    gameState.isRolling ||
                    gameState.turn !== "player"
                  }
                  variant="default"
                  className="flex-1 bg-white text-black hover:bg-gray-100 text-lg px-6 py-3 rounded-md">
                  Evolve
                </Button>
              )}
            </div>
          </div>
        )}

      {/* Replacement Phase Overlay - Rendered outside the main game content div */}
      {gameState.gamePhase === "inGame" &&
        gameState.replacementPhaseForPlayer === "player" &&
        gameState.selectedGameMode?.id === "set-3" && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <h4 className="text-white text-lg sm:text-xl font-semibold text-center mb-4">
              Your spirit has been shattered! Summon a new guardian to the
              arena:
            </h4>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {gameState.player.benchCreatures
                .filter((c) => c.currentHp > 0)
                .map((creature) => (
                  <CreatureCard
                    key={creature.id}
                    creature={creature}
                    onClick={() => handlePlayerReplacementSelection(creature)}
                    gameMode={gameState.selectedGameMode?.id}
                    className="cursor-pointer"
                  />
                ))}
            </div>
            {gameState.player.benchCreatures.filter((c) => c.currentHp > 0)
              .length === 0 && (
              <p className="text-red-400 text-sm mt-4">
                No viable benched creatures. Game Over!
              </p>
            )}
          </div>
        )}
    </>
  );
}
