"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface DiceComponentProps {
  value: number;
  isRolling: boolean;
  isCorrupted?: boolean;
  gameMode?: string;
  isCriticalMiss?: boolean;
  isCriticalHit?: boolean; // Add critical hit prop
}

export default function DiceComponent({
  value,
  isRolling,
  isCorrupted = false,
  gameMode,
  isCriticalMiss = false,
  isCriticalHit = false,
}: DiceComponentProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [showCriticalMiss, setShowCriticalMiss] = useState(false);
  const [showCriticalHit, setShowCriticalHit] = useState(false);
  const [showCorruptedDiceNotification] = useState(false);

  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  // Handle critical miss animation
  useEffect(() => {
    if (isCriticalMiss && !isRolling) {
      setShowCriticalMiss(true);
      // Hide the critical miss message after animation completes
      const timer = setTimeout(() => {
        setShowCriticalMiss(false);
      }, 1000); // Animation duration matches CSS

      return () => clearTimeout(timer);
    }
  }, [isCriticalMiss, isRolling]);

  // Handle critical hit animation
  useEffect(() => {
    if (isCriticalHit && !isRolling) {
      setShowCriticalHit(true);
      // Hide the critical hit message after animation completes
      const timer = setTimeout(() => {
        setShowCriticalHit(false);
      }, 1000); // Animation duration matches CSS

      return () => clearTimeout(timer);
    }
  }, [isCriticalHit, isRolling]);

  // Only show corruption effects in Evolution Mode (set-3)
  const showCorruptionEffects = isCorrupted && gameMode === "set-3";

  return (
    <div className="relative">
      {/* Purple aura effect for corrupted dice - only in Evolution Mode */}
      {showCorruptionEffects && (
        <div className="absolute inset-0 rounded-lg animate-pulse">
          <div className="absolute inset-0 bg-purple-500/30 rounded-lg blur-md animate-pulse"></div>
          <div
            className="absolute inset-0 bg-purple-400/20 rounded-lg blur-lg animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute inset-0 bg-purple-600/40 rounded-lg blur-sm animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>
      )}

      <div
        className={cn(
          "relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg shadow-lg flex items-center justify-center text-6xl sm:text-8xl font-bold transition-all duration-300",
          showCorruptionEffects
            ? "bg-black text-white border-2 border-purple-500 shadow-purple-500/50"
            : "bg-white text-black",
          isRolling && "animate-[dice-flip-animation_0.5s_ease-out_forwards]",
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: isRolling ? "rotateY(360deg)" : "rotateY(0deg)",
          boxShadow: showCorruptionEffects
            ? "0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)"
            : undefined,
        }}
      >
        {isRolling ? (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-4xl",
              showCorruptionEffects ? "text-purple-300" : "text-gray-400",
            )}
          >
            🎲
          </span>
        ) : (
          displayValue
        )}

        {/* Corrupted die mystical symbols overlay - only in Evolution Mode */}
        {showCorruptionEffects && !isRolling && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute top-1 left-1 text-purple-400 text-xs animate-pulse">
              🌀
            </div>
            <div
              className="absolute top-1 right-1 text-purple-400 text-xs animate-pulse"
              style={{ animationDelay: "0.3s" }}
            >
              ✨
            </div>
            <div
              className="absolute bottom-1 left-1 text-purple-400 text-xs animate-pulse"
              style={{ animationDelay: "0.6s" }}
            >
              ⚡
            </div>
            <div
              className="absolute bottom-1 right-1 text-purple-400 text-xs animate-pulse"
              style={{ animationDelay: "0.9s" }}
            >
              🔮
            </div>
          </div>
        )}
      </div>

      {/* Critical Miss Animation */}
      {showCriticalMiss && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-critical-miss text-red-500 font-bold text-2xl sm:text-3xl md:text-4xl drop-shadow-lg whitespace-nowrap text-center">
            MISS!
          </div>
        </div>
      )}

      {/* Critical Hit Animation */}
      {showCriticalHit && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-critical-miss text-red-500 font-bold text-2xl sm:text-3xl md:text-4xl drop-shadow-lg whitespace-nowrap text-center">
            Critical Hit!
          </div>
        </div>
      )}

      {/* Corrupted Dice Notification - Top Center */}
      {showCorruptedDiceNotification && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] p-4 bg-purple-800 text-white rounded-lg shadow-xl animate-fade-in-out text-center text-lg sm:text-xl font-bold border-2 border-purple-400">
          CORRUPTED DICE ACTIVATED!
        </div>
      )}
    </div>
  );
}
