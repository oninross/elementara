"use client";

import type React from "react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Creature, Element } from "@/lib/creatures";
import { Info } from "lucide-react";
import { useState } from "react";

interface CreatureCardProps {
  creature: Creature;
  isFaceDown?: boolean;
  isActive?: boolean;
  isOpponent?: boolean;
  onClick?: (creature: Creature) => void;
  onDetailView?: (creature: Creature) => void;
  className?: string;
  isAttacking?: boolean;
  isShaking?: boolean;
  isDefending?: boolean;
  isDamaged?: boolean;
  isCorrupted?: boolean;
  gameMode?: string;
}

const elementBorderColors: Record<Element, string> = {
  Fire: "border-red-600",
  Water: "border-blue-600",
  Earth: "border-green-600",
  Air: "border-purple-500",
};

const elementFallbackColors: Record<Element, string> = {
  Fire: "bg-gradient-to-br from-red-500 to-orange-600",
  Water: "bg-gradient-to-br from-blue-500 to-cyan-600",
  Earth: "bg-gradient-to-br from-green-500 to-emerald-600",
  Air: "bg-gradient-to-br from-purple-500 to-indigo-600",
};

const elementBackgroundImages: Record<Element, string> = {
  Fire: "bg-[url('/images/backgrounds/fire-bg.jpeg')] bg-cover bg-center bg-no-repeat",
  Water:
    "bg-[url('/images/backgrounds/water-bg.jpeg')] bg-cover bg-center bg-no-repeat",
  Earth:
    "bg-[url('/images/backgrounds/earth-bg.jpeg')] bg-cover bg-center bg-no-repeat",
  Air: "bg-[url('/images/backgrounds/air-bg.jpeg')] bg-cover bg-center bg-no-repeat",
};

const elementTextColors: Record<Element, string> = {
  Fire: "text-white",
  Water: "text-white",
  Earth: "text-white",
  Air: "text-white",
};

const elementTextShadows: Record<Element, string> = {
  Fire: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_1px_1px_2px_rgb(0_0_0_/_80%)]",
  Water:
    "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_1px_1px_2px_rgb(0_0_0_/_80%)]",
  Earth:
    "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_1px_1px_2px_rgb(0_0_0_/_80%)]",
  Air: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_1px_1px_2px_rgb(0_0_0_/_80%)]",
};

const elementDetailBackgroundImages: Record<Element, string> = {
  Fire: "/images/backgrounds/fire-bg.jpeg",
  Water: "/images/backgrounds/water-bg.jpeg",
  Earth: "/images/backgrounds/earth-bg.jpeg",
  Air: "/images/backgrounds/air-bg.jpeg",
};

const elementEmojis: Record<Element, string> = {
  Fire: "🔥",
  Water: "💧",
  Earth: "🌱",
  Air: "🌬️",
};

const creatureImages: Record<string, string> = {
  // Fire creatures
  apoymortis: "/images/apoymortis.jpeg",
  magdanok: "/images/magdanok.jpeg",
  silabrix: "/images/silabrix.jpeg",
  sigael: "/images/sigael.jpeg",
  alkaulon: "/images/alkaulon.jpeg",
  infernuko: "/images/infernuko.jpeg",
  asonis: "/images/asonis.jpeg",
  liyabon: "/images/liyabon.jpeg",
  drakalayo: "/images/drakalayo.jpeg",

  // Water creatures
  sireniya: "/images/sireniya.jpeg",
  niebarko: "/images/niebarko.jpeg",
  lakanis: "/images/lakanis.jpeg",
  tundragan: "/images/tundragan.jpeg",
  tayodora: "/images/tayodora.jpeg",
  yelogon: "/images/yelogon.jpeg",
  agwatara: "/images/agwatara.jpeg",
  ulanik: "/images/ulanik.jpeg",
  mardagat: "/images/mardagat.jpeg",

  // Earth creatures
  talahus: "/images/talahus.jpeg",
  dunobrak: "/images/dunobrak.jpeg",
  guwardanox: "/images/guwardanox.jpeg",
  grobayan: "/images/grobayan.jpeg",
  putrani: "/images/putrani.jpeg",
  barkhilan: "/images/barkhilan.jpeg",
  pamantok: "/images/pamantok.jpeg",
  anitubi: "/images/anitubi.jpeg",
  silvaran: "/images/silvaran.jpeg",

  // Air creatures
  zephyltik: "/images/zephyltik.jpeg",
  bagynox: "/images/bagynox.jpeg",
  haliyas: "/images/haliyas.jpeg",
  layawing: "/images/layawing.jpeg",
  alingaw: "/images/alingaw.jpeg",
  kaelykat: "/images/kaelykat.jpeg",
  hangguran: "/images/hangguran.jpeg",
  himpayan: "/images/himpayan.jpeg",
  uludronis: "/images/uludronis.jpeg",
};

export const CreatureCard = ({
  creature,
  isFaceDown = false,
  isActive = false,
  isOpponent = false,
  onClick,
  onDetailView,
  className,
  isAttacking = false,
  isShaking = false,
  isDefending = false,
  isDamaged = false,
  isCorrupted = false,
  gameMode,
}: CreatureCardProps) => {
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const hpPercentage = (creature.currentHp / creature.maxHp) * 100;

  // Only show corruption effects in Evolution Mode (set-3)
  const showCorruptionEffects = isCorrupted && gameMode === "set-3";

  const handleClick = () => {
    if (onClick) {
      onClick(creature);
    }
  };

  const handleDoubleClick = () => {
    if (onDetailView) {
      onDetailView(creature);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShowingDetails(true);
  };

  const handleCloseDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShowingDetails(false);
  };

  if (isFaceDown) {
    return (
      <Card
        className={cn(
          // Base responsive sizing - scales smoothly across all breakpoints
          "w-16 h-20 xs:w-18 xs:h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 lg:w-28 lg:h-36 xl:w-32 xl:h-40",
          "flex items-center justify-center rounded shadow-lg border-2",
          "bg-[url('/images/card-background.jpeg')] bg-cover bg-center bg-no-repeat",
          "transform transition-all duration-200 hover:scale-105 cursor-pointer",
          "aspect-[4/5]",
          // Defending player receiving damage - red border (only when shaking)
          isDefending && isShaking && "border-red-500 ring-2 ring-red-500/50",
          // Active player's turn - yellow border (if not currently defending and shaking)
          isActive &&
            !isDefending &&
            "border-yellow-400 ring-2 ring-yellow-400/50",
          // Default state for other slots - dark gray border
          (!isActive && !isDefending) || (isActive && isDefending && !isShaking)
            ? "border-gray-700"
            : "",
          isDamaged && "animate-pulse-damage",
          className
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}>
        <CardContent className="p-0 text-white/70 text-xs sm:text-sm font-bold flex items-center justify-center h-full">
          <span className="sr-only">Face down card</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div
        className={cn(
          // Responsive sizing with consistent aspect ratio
          "w-16 xs:w-18 sm:w-20 md:w-24 lg:w-28 xl:w-32", // Widths remain, heights derived from aspect ratio
          "aspect-[16/25]", // Increased height by 25% (4 / (5 * 1.25) = 16/25)
          "rounded shadow-lg border-2 overflow-hidden relative cursor-pointer",
          "flex flex-col",
          // Fallback background color (loads first)
          elementFallbackColors[creature.element],
          // Element border color
          elementBorderColors[creature.element],
          // Defending player receiving damage - red border (only when shaking)
          isDefending && isShaking && "border-red-500 ring-2 ring-red-500/50",
          // Active player's turn - yellow border (if not currently defending and shaking)
          isActive &&
            !isDefending &&
            "border-yellow-400 ring-1 sm:ring-2 ring-yellow-400 ring-offset-1 sm:ring-offset-2 ring-offset-transparent",
          // Corrupted creature - purple border and glow (only in Evolution Mode)
          showCorruptionEffects &&
            "border-purple-500 ring-2 ring-purple-500/50",
          // Default state for other slots - dark gray border (overridden by elementBorderColors if active/defending)
          (!isActive && !isDefending && !showCorruptionEffects) ||
            (isActive && isDefending && !isShaking)
            ? "border-gray-700"
            : "",
          "transform transition-all duration-200 hover:scale-105",
          creature.currentHp <= 0 && "grayscale",
          isAttacking && "animate-attack-animation",
          isShaking && "animate-shake-animation",
          isDamaged && "animate-pulse-damage",
          className
        )}
        style={{
          boxShadow: showCorruptionEffects
            ? "0 0 15px rgba(168, 85, 247, 0.4), 0 0 30px rgba(168, 85, 247, 0.2)"
            : undefined,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}>
        {/* Background overlay for better text readability on small cards */}
        <div className="absolute inset-0 bg-black/40 rounded z-[1]" />

        {/* Purple shimmer overlay for corrupted creatures - only in Evolution Mode */}
        {showCorruptionEffects && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-purple-600/20 rounded z-[2] animate-pulse"></div>
            <div
              className="absolute inset-0 bg-gradient-to-tl from-purple-400/15 via-purple-500/10 to-transparent rounded z-[2] animate-pulse"
              style={{ animationDelay: "0.5s" }}></div>
            <div className="absolute top-0 left-0 w-full h-full rounded z-[2]">
              <div className="absolute top-1 right-1 text-purple-400 text-xs animate-pulse">
                🌀
              </div>
              <div
                className="absolute bottom-1 left-1 text-purple-400 text-xs animate-pulse"
                style={{ animationDelay: "0.7s" }}>
                ✨
              </div>
            </div>
          </>
        )}

        {/* Info Icon - Positioned at top-right corner */}
        <button
          onClick={handleInfoClick}
          className="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
          title="View card details">
          <Info className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
        </button>

        {/* Card Art - Main area - fills entire card */}
        <div className="absolute inset-0 z-[2] flex items-center justify-center overflow-hidden rounded">
          {creatureImages[creature.id] ? (
            <Image
              src={creatureImages[creature.id] || "/placeholder.svg"}
              alt={creature.name}
              fill // Use fill to make it cover the parent div
              style={{ objectFit: "cover", objectPosition: "center" }} // Equivalent to object-cover object-center
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Responsive sizes for better optimization
            />
          ) : (
            <div
              className={cn(
                "w-full h-full",
                elementBackgroundImages[creature.element]
              )}
            />
          )}
        </div>

        {/* Card Header - Name and Level aligned with same font size */}
        <div
          className={cn(
            "absolute bottom-6 left-2 right-2 z-[6]",
            elementTextColors[creature.element],
            elementTextShadows[creature.element],
            "font-extrabold"
          )}>
          <div className="flex justify-between items-baseline w-full px-0">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-[9px] sm:text-[10px] md:text-xs font-extrabold truncate leading-tight tracking-wide">
                {creature.name.toUpperCase()}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="text-[9px] sm:text-[10px] md:text-xs font-extrabold leading-tight tracking-wide">
                lvl {creature.stage.replace("Level ", "")}
              </div>
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="absolute bottom-4 left-2 right-2 z-[6]">
          <div className="h-1 sm:h-1.5 md:h-2 bg-black/70 rounded-full border border-black/50">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                hpPercentage > 60
                  ? "bg-green-500"
                  : hpPercentage > 30
                  ? "bg-yellow-500"
                  : "bg-red-500",
                "shadow-sm"
              )}
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* HP Points Display - With black frosted background */}
        <div
          className={cn(
            "absolute bottom-0 left-2 right-2 z-[6]",
            elementTextColors[creature.element],
            elementTextShadows[creature.element]
          )}>
          <div className="text-center">
            <div className="text-[8px] sm:text-[9px] md:text-[10px] font-extrabold tracking-wide whitespace-nowrap">
              {creature.currentHp}/{creature.maxHp}
            </div>
          </div>
        </div>

        {/* Knocked Out Overlay */}
        {creature.currentHp <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[7] rounded">
            <span className="text-red-500 font-bold text-lg sm:text-xl md:text-2xl drop-shadow-lg">
              KO
            </span>
          </div>
        )}
      </div>

      {isShowingDetails && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in-0"
          onClick={handleCloseDetails}>
          <div
            className="relative w-full max-w-[22rem] sm:max-w-sm animate-card-flip-and-scale"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseDetails}
              className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border-2 border-white/50"
              title="Close details">
              <span className="text-xl font-bold">✕</span>
            </button>

            {/* Main card container */}
            <div className="relative aspect-[5/7] w-full rounded shadow-2xl overflow-hidden border border-gray-700">
              {/* Background Image */}
              {/* <img
                src={elementDetailBackgroundImages[creature.element] || "/placeholder.svg"}
                alt={`${creature.element} background`}
                className="absolute inset-0 w-full h-full object-cover"
              /> */}

              {/* Creature Image in Detail View */}
              {creatureImages[creature.id] && (
                <Image
                  src={creatureImages[creature.id] || "/placeholder.svg"}
                  alt={creature.name}
                  fill // Use fill to make it cover the parent div
                  style={{ objectFit: "cover", objectPosition: "center" }} // Equivalent to object-cover object-center
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Responsive sizes for better optimization
                />
              )}

              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 text-white">
                <h2
                  className="text-3xl sm:text-4xl font-black tracking-wider uppercase"
                  style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                  {creature.name}
                </h2>
                <p
                  className="text-sm text-gray-300 mt-1 font-medium"
                  style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.7)" }}>
                  {creature.stage.replace("Level", "Stage")}
                  {creature.stage === "Level 3"
                    ? " (Final Evolution)"
                    : ""} • {creature.element.toUpperCase()}
                </p>

                <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-around">
                  {/* HP */}
                  <div className="flex items-center gap-x-2">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      HP
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {creature.maxHp}
                    </p>
                  </div>

                  {/* Resistance */}
                  <div className="flex items-center gap-x-2">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      RES
                    </p>
                    {creature.resistance ? (
                      <span className="text-2xl sm:text-3xl">
                        {elementEmojis[creature.resistance]}
                      </span>
                    ) : (
                      <span className="text-xl font-bold">-</span>
                    )}
                  </div>

                  {/* Weakness */}
                  <div className="flex items-center gap-x-2">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      WEAK
                    </p>
                    {creature.weakness ? (
                      <span className="text-2xl sm:text-3xl">
                        {elementEmojis[creature.weakness]}
                      </span>
                    ) : (
                      <span className="text-xl font-bold">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
