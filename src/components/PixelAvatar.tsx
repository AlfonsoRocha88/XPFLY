import { AvatarConfig } from "@/lib/avatar-presets";

interface PixelAvatarProps {
  config: AvatarConfig;
  size?: number;
  animated?: boolean;
  className?: string;
}

/**
 * Pixel-art avatar rendered with SVG layers (SAO/Solo Leveling style).
 * Uses a 32x40 logical grid scaled up via viewBox.
 */
const PixelAvatar = ({ config, size = 128, animated = true, className }: PixelAvatarProps) => {
  const { skinColor, hairStyle, hairColor, eyeStyle, eyeColor, faceStyle, height, outfit } = config;

  // Outfit accent color
  const outfitColors: Record<string, { body: string; accent: string }> = {
    hunter: { body: "#0f172a", accent: "#06b6d4" },
    casual: { body: "#475569", accent: "#94a3b8" },
    armor: { body: "#334155", accent: "#facc15" },
    mage: { body: "#581c87", accent: "#c4b5fd" },
  };
  const outfitColor = outfitColors[outfit] ?? outfitColors.hunter;

  // Face shape adjustments
  const faceWidth = faceStyle === "angular" ? 11 : faceStyle === "soft" ? 13 : 12;
  const faceX = (32 - faceWidth) / 2;
  const chinY = faceStyle === "angular" ? 18 : 19;

  // Apply height (Y scale only on body region)
  const bodyScaleY = height;

  return (
    <div className={className} style={{ display: "inline-block", lineHeight: 0 }}>
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 32 40"
        shapeRendering="crispEdges"
        style={{
          imageRendering: "pixelated",
          filter: `drop-shadow(0 0 8px ${outfitColor.accent}40)`,
          animation: animated ? "avatar-breathe 3s ease-in-out infinite" : undefined,
        }}
      >
        {/* ===== BODY (with height scaling) ===== */}
        <g transform={`translate(0, ${20 * (1 - bodyScaleY)}) scale(1, ${bodyScaleY})`} style={{ transformOrigin: "16px 40px" }}>
          {/* Torso / outfit */}
          <rect x="9" y="20" width="14" height="13" fill={outfitColor.body} />
          {/* Outfit accent line (chest piece) */}
          <rect x="15" y="20" width="2" height="13" fill={outfitColor.accent} opacity="0.8" />
          {/* Shoulders */}
          <rect x="7" y="20" width="2" height="4" fill={outfitColor.body} />
          <rect x="23" y="20" width="2" height="4" fill={outfitColor.body} />
          {/* Arms */}
          <rect x="7" y="22" width="2" height="8" fill={outfitColor.body} />
          <rect x="23" y="22" width="2" height="8" fill={outfitColor.body} />
          {/* Hands */}
          <rect x="7" y="30" width="2" height="2" fill={skinColor} />
          <rect x="23" y="30" width="2" height="2" fill={skinColor} />
          {/* Legs */}
          <rect x="11" y="33" width="4" height="6" fill={outfitColor.body} />
          <rect x="17" y="33" width="4" height="6" fill={outfitColor.body} />
          {/* Boots */}
          <rect x="11" y="38" width="4" height="2" fill="#0a0a0a" />
          <rect x="17" y="38" width="4" height="2" fill="#0a0a0a" />
          {/* Neck */}
          <rect x="14" y="18" width="4" height="2" fill={skinColor} />
        </g>

        {/* ===== FACE / HEAD ===== */}
        <rect x={faceX} y="6" width={faceWidth} height={chinY - 6} fill={skinColor} />
        {/* Face shadow (chin) */}
        <rect x={faceX} y={chinY - 1} width={faceWidth} height="1" fill={skinColor} opacity="0.7" />

        {/* ===== EYES ===== */}
        {renderEyes(eyeStyle, eyeColor, faceX, faceWidth)}

        {/* ===== MOUTH ===== */}
        <rect x="15" y="15" width="2" height="1" fill="#3d2614" opacity="0.6" />

        {/* ===== HAIR ===== */}
        {renderHair(hairStyle, hairColor, faceX, faceWidth)}
      </svg>

      <style>{`
        @keyframes avatar-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
};

function renderEyes(style: string, color: string, faceX: number, faceWidth: number) {
  const leftEyeX = faceX + 2;
  const rightEyeX = faceX + faceWidth - 4;

  switch (style) {
    case "sharp":
      return (
        <>
          <rect x={leftEyeX} y="11" width="2" height="1" fill={color} />
          <rect x={leftEyeX - 1} y="12" width="3" height="1" fill={color} opacity="0.5" />
          <rect x={rightEyeX} y="11" width="2" height="1" fill={color} />
          <rect x={rightEyeX} y="12" width="3" height="1" fill={color} opacity="0.5" />
        </>
      );
    case "big":
      return (
        <>
          <rect x={leftEyeX - 1} y="11" width="3" height="3" fill="#ffffff" />
          <rect x={leftEyeX} y="12" width="2" height="2" fill={color} />
          <rect x={leftEyeX} y="12" width="1" height="1" fill="#ffffff" opacity="0.8" />
          <rect x={rightEyeX - 1} y="11" width="3" height="3" fill="#ffffff" />
          <rect x={rightEyeX - 1} y="12" width="2" height="2" fill={color} />
          <rect x={rightEyeX} y="12" width="1" height="1" fill="#ffffff" opacity="0.8" />
        </>
      );
    case "closed":
      return (
        <>
          <rect x={leftEyeX - 1} y="12" width="3" height="1" fill="#3d2614" />
          <rect x={rightEyeX - 1} y="12" width="3" height="1" fill="#3d2614" />
        </>
      );
    case "glow":
      return (
        <>
          <rect x={leftEyeX} y="11" width="2" height="2" fill={color} />
          <rect x={leftEyeX} y="11" width="2" height="2" fill={color} opacity="0.6">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x={rightEyeX} y="11" width="2" height="2" fill={color} />
          <rect x={rightEyeX} y="11" width="2" height="2" fill={color} opacity="0.6">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </rect>
        </>
      );
    case "normal":
    default:
      return (
        <>
          <rect x={leftEyeX} y="12" width="2" height="2" fill={color} />
          <rect x={leftEyeX} y="12" width="1" height="1" fill="#ffffff" opacity="0.7" />
          <rect x={rightEyeX} y="12" width="2" height="2" fill={color} />
          <rect x={rightEyeX} y="12" width="1" height="1" fill="#ffffff" opacity="0.7" />
        </>
      );
  }
}

function renderHair(style: string, color: string, faceX: number, faceWidth: number) {
  switch (style) {
    case "bald":
      return null;
    case "spiky":
      return (
        <>
          <rect x={faceX} y="4" width={faceWidth} height="4" fill={color} />
          <rect x={faceX + 1} y="2" width="2" height="3" fill={color} />
          <rect x={faceX + 4} y="1" width="2" height="4" fill={color} />
          <rect x={faceX + 7} y="2" width="2" height="3" fill={color} />
          <rect x={faceX + faceWidth - 4} y="1" width="2" height="4" fill={color} />
          <rect x={faceX + faceWidth - 2} y="2" width="2" height="3" fill={color} />
        </>
      );
    case "long":
      return (
        <>
          <rect x={faceX - 1} y="4" width={faceWidth + 2} height="6" fill={color} />
          <rect x={faceX - 1} y="10" width="2" height="10" fill={color} />
          <rect x={faceX + faceWidth - 1} y="10" width="2" height="10" fill={color} />
        </>
      );
    case "ponytail":
      return (
        <>
          <rect x={faceX} y="4" width={faceWidth} height="5" fill={color} />
          <rect x={faceX + faceWidth - 2} y="6" width="3" height="9" fill={color} />
          <rect x={faceX + faceWidth} y="14" width="2" height="3" fill={color} />
        </>
      );
    case "bangs":
      return (
        <>
          <rect x={faceX} y="4" width={faceWidth} height="6" fill={color} />
          <rect x={faceX + 1} y="9" width={faceWidth - 2} height="2" fill={color} />
          <rect x={faceX - 1} y="6" width="2" height="8" fill={color} />
          <rect x={faceX + faceWidth - 1} y="6" width="2" height="8" fill={color} />
        </>
      );
    case "messy":
      return (
        <>
          <rect x={faceX} y="3" width={faceWidth} height="5" fill={color} />
          <rect x={faceX + 2} y="2" width="3" height="2" fill={color} />
          <rect x={faceX + 6} y="1" width="2" height="3" fill={color} />
          <rect x={faceX + faceWidth - 4} y="2" width="3" height="2" fill={color} />
          <rect x={faceX - 1} y="5" width="2" height="4" fill={color} />
          <rect x={faceX + faceWidth - 1} y="5" width="2" height="4" fill={color} />
        </>
      );
    case "mohawk":
      return (
        <>
          <rect x={faceX + faceWidth / 2 - 1} y="1" width="3" height="9" fill={color} />
          <rect x={faceX} y="6" width={faceWidth} height="2" fill={color} opacity="0.7" />
        </>
      );
    case "short":
    default:
      return (
        <>
          <rect x={faceX} y="4" width={faceWidth} height="4" fill={color} />
          <rect x={faceX - 1} y="5" width="2" height="3" fill={color} />
          <rect x={faceX + faceWidth - 1} y="5" width="2" height="3" fill={color} />
          <rect x={faceX + 1} y="3" width={faceWidth - 2} height="2" fill={color} />
        </>
      );
  }
}

export default PixelAvatar;
