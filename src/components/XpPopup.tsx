import { useEffect, useState } from "react";

interface XpPopupProps {
  amount: number;
  x?: number;
  y?: number;
  onComplete: () => void;
}

const XpPopup = ({ amount, onComplete }: XpPopupProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed top-20 right-8 z-50 pointer-events-none">
      <div className="xp-popup font-pixel text-sm text-yellow-400">
        +{amount} XP
      </div>
    </div>
  );
};

export default XpPopup;
