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
      setTimeout(onComplete, 500);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="level-up-container animate-scale-in pointer-events-auto">
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-primary bg-card p-8 shadow-[0_0_60px_hsl(var(--primary)/0.4)]">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 animate-pulse" fill="currentColor" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
          <p className="font-pixel text-xs text-primary tracking-wider">¡NIVEL ARRIBA!</p>
          <p className="font-pixel text-3xl text-foreground">{level}</p>
          <p className="font-pixel text-xs text-muted-foreground">Sigue así, campeón</p>
        </div>
      </div>
    </div>
  );
};

export default LevelUpToast;
