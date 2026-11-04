import { useEffect, useState } from "react";
import { Star } from "lucide-react";

interface LevelUpToastProps {
  level: number;
  onComplete: () => void;
}

const LevelUpToast = ({ level, onComplete }: LevelUpToastProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={() => setVisible(false)}
    >
      <div className="level-up-container flex flex-col items-center gap-2 rounded-3xl bg-card px-10 py-8 text-center shadow-lift">
        <div className="flex gap-1 text-xp">
          {[0, 1, 2].map((i) => (
            <Star key={i} className="h-7 w-7" fill="currentColor" />
          ))}
        </div>
        <p className="text-base font-extrabold text-primary">¡Subiste de nivel!</p>
        <p className="text-6xl font-black leading-none">{level}</p>
        <p className="text-sm font-semibold text-muted-foreground">Sigue así 💪</p>
      </div>
    </div>
  );
};

export default LevelUpToast;
