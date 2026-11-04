import { useEffect } from "react";
import { Zap } from "lucide-react";

interface XpPopupProps {
  amount: number;
  onComplete: () => void;
}

const XpPopup = ({ amount, onComplete }: XpPopupProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] z-50 flex justify-center">
      <div className="xp-popup flex items-center gap-1.5 rounded-full bg-xp px-4 py-2 text-base font-black text-white shadow-lift">
        <Zap className="h-4 w-4" fill="currentColor" /> +{amount} XP
      </div>
    </div>
  );
};

export default XpPopup;
