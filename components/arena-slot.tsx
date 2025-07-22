"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Creature } from "@/lib/creatures";
import { CreatureCard } from "@/components/creature-card";

interface ArenaSlotProps {
  label: string;
  isActive?: boolean;
  isOpponent?: boolean;
  creature: Creature | null;
  onSlotClick?: (creature: Creature | null) => void;
  className?: string;
  isAttacking?: boolean;
  isShaking?: boolean;
  isDefending?: boolean;
  isDamaged?: boolean;
  isCorrupted?: boolean;
  gameMode?: string; // Add gameMode prop
}

const ArenaSlot = ({
  label,
  isActive = false,
  isOpponent = false,
  creature,
  onSlotClick,
  className,
  isAttacking = false,
  isShaking = false,
  isDefending = false,
  isDamaged = false,
  isCorrupted = false,
  gameMode,
}: ArenaSlotProps) => {
  return (
    <Card
      className={cn(
        // Responsive sizing that matches creature cards
        "w-16 h-20 xs:w-18 xs:h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 lg:w-28 lg:h-36 xl:w-32 xl:h-40",
        "flex flex-col items-center justify-center transition-all duration-200",
        "bg-transparent border-2 aspect-[4/5]",
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
        className,
      )}
      onClick={() => onSlotClick?.(creature)}
    >
      <CardContent className="p-0 w-full h-full flex items-center justify-center">
        {creature ? (
          <CreatureCard
            creature={creature}
            isFaceDown={!creature.isFaceUp}
            isActive={isActive}
            isOpponent={isOpponent}
            isAttacking={isAttacking}
            isShaking={isShaking}
            isDefending={isDefending}
            isDamaged={isDamaged}
            isCorrupted={isCorrupted}
            gameMode={gameMode} // Pass gameMode to CreatureCard
            className="w-full h-full"
          />
        ) : (
          <div className="text-white/70 text-[0.5rem] xs:text-[0.6rem] sm:text-xs md:text-sm font-medium text-center">
            {label}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArenaSlot;
