import { AvatarConfig, SKIN_COLORS, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, EYE_STYLES, FACE_STYLES, OUTFITS, ALL_OUTFITS, getOutfit } from "@/lib/avatar-presets";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AvatarEditorProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  unlockedOutfits?: string[];
}

const AvatarEditor = ({ config, onChange, unlockedOutfits = [] }: AvatarEditorProps) => {
  const update = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const baseIds = OUTFITS.map((o) => o.id);
  const availableIds = Array.from(new Set([...baseIds, ...unlockedOutfits]));
  const availableOutfits = availableIds.map((id) => getOutfit(id));

  return (
    <div className="space-y-6">
      {/* Face */}
      <Section title="Rostro">
        <div className="flex flex-wrap gap-2">
          {FACE_STYLES.map((s) => (
            <OptionButton key={s.id} active={config.faceStyle === s.id} onClick={() => update("faceStyle", s.id)}>
              {s.name}
            </OptionButton>
          ))}
        </div>
      </Section>

      {/* Skin */}
      <Section title="Color de piel">
        <ColorRow colors={SKIN_COLORS} active={config.skinColor} onSelect={(c) => update("skinColor", c)} />
      </Section>

      {/* Hair style */}
      <Section title="Estilo de pelo">
        <div className="flex flex-wrap gap-2">
          {HAIR_STYLES.map((s) => (
            <OptionButton key={s.id} active={config.hairStyle === s.id} onClick={() => update("hairStyle", s.id)}>
              {s.name}
            </OptionButton>
          ))}
        </div>
      </Section>

      {/* Hair color */}
      <Section title="Color de pelo">
        <ColorRow colors={HAIR_COLORS} active={config.hairColor} onSelect={(c) => update("hairColor", c)} />
      </Section>

      {/* Eye style */}
      <Section title="Estilo de ojos">
        <div className="flex flex-wrap gap-2">
          {EYE_STYLES.map((s) => (
            <OptionButton key={s.id} active={config.eyeStyle === s.id} onClick={() => update("eyeStyle", s.id)}>
              {s.name}
            </OptionButton>
          ))}
        </div>
      </Section>

      {/* Eye color */}
      <Section title="Color de ojos">
        <ColorRow colors={EYE_COLORS} active={config.eyeColor} onSelect={(c) => update("eyeColor", c)} />
      </Section>

      {/* Height */}
      <Section title={`ALTURA — ${(config.height * 100).toFixed(0)}%`}>
        <Slider
          min={0.85}
          max={1.15}
          step={0.05}
          value={[config.height]}
          onValueChange={(v) => update("height", v[0])}
        />
      </Section>

      {/* Outfit */}
      <Section title={`ATUENDO — ${availableOutfits.length} desbloqueados`}>
        <div className="flex flex-wrap gap-2">
          {availableOutfits.map((o) => (
            <OptionButton key={o.id} active={config.outfit === o.id} onClick={() => update("outfit", o.id)}>
              <span className="inline-block h-3 w-3 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: o.accent }} />
              {o.name}
            </OptionButton>
          ))}
        </div>
      </Section>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="font-system text-xs text-primary/80">{title}</h3>
    {children}
  </div>
);

const OptionButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-md text-xs font-system transition-all border",
      active
        ? "bg-primary/15 border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
        : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
    )}
  >
    {children}
  </button>
);

const ColorRow = ({ colors, active, onSelect }: { colors: string[]; active: string; onSelect: (c: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {colors.map((c) => (
      <button
        key={c}
        onClick={() => onSelect(c)}
        className={cn(
          "h-8 w-8 rounded-md border-2 transition-all",
          active.toLowerCase() === c.toLowerCase()
            ? "border-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)] scale-110"
            : "border-border hover:border-primary/50"
        )}
        style={{ backgroundColor: c }}
      />
    ))}
  </div>
);

export default AvatarEditor;
