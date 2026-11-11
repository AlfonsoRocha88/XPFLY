import type { ConstellationId } from "@shared/achievements";

/**
 * Galaxy world in abstract units. Portrait aspect (~0.62) so the overview fits a phone.
 * Each constellation has one star per achievement (same order as the catalog) and hand-drawn
 * edges, so its shape stays recognizable from far away.
 */
export const WORLD = { width: 1000, height: 1620 };

export interface ConstellationShape {
  center: [number, number];
  /** Star positions relative to center, one per achievement in catalog order. */
  stars: [number, number][];
  edges: [number, number][];
  /** Accent used for the lit glow (picked to match the nebula behind it). */
  glow: number;
}

export const SHAPES: Record<ConstellationId, ConstellationShape> = {
  // A sunrise arc
  ritmo: { center: [290, 250], stars: [[-150, 70], [-70, -55], [55, -85], [160, 5]], edges: [[0, 1], [1, 2], [2, 3]], glow: 0xffc46b },
  // A "W" like Cassiopeia: steady rhythm
  constancia: { center: [710, 470], stars: [[-170, -45], [-85, 60], [0, -30], [85, 70], [170, -55]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]], glow: 0xff8a5c },
  // An arrowhead / target
  enfoque: { center: [300, 790], stars: [[0, -125], [-115, -15], [115, -15], [-55, 115], [55, 115]], edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]], glow: 0x7fd8ff },
  // A lotus fan
  bienestar: { center: [705, 1030], stars: [[0, 115], [-125, 10], [-50, -95], [50, -95], [125, 10]], edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4]], glow: 0x9dffd0 },
  // An open book with its spine
  conocimiento: { center: [290, 1300], stars: [[-160, -60], [0, -5], [160, -60], [0, 120]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 3]], glow: 0xc9a2ff },
  // A mountain range
  ascenso: { center: [690, 1490], stars: [[-185, 95], [-115, -10], [-45, 60], [35, -125], [115, -20], [190, 95]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], glow: 0xffe08a },
};

/** World-space bounds of a constellation, padded for the zoom framing. */
export function shapeBounds(s: ConstellationShape, pad = 90) {
  const xs = s.stars.map(([x]) => s.center[0] + x);
  const ys = s.stars.map(([, y]) => s.center[1] + y);
  return {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
}
