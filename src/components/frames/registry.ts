import "./frames.css";
import type { FrameProps } from "./kit";
import { FlameFrame, FocusFrame, LeavesFrame, PagesFrame, PeaksFrame, SunFrame } from "./achievement";
import HaloFrame from "./halo";
import CristalFrame from "./cristal";
import OrbitaFrame from "./orbita";
import BronceFrame from "./bronce";
import HiedraFrame from "./hiedra";
import PuntosFrame from "./puntos";
import PetaloFrame from "./petalo";
import LlamasFrame from "./llamas";
import EscarchaFrame from "./escarcha";
import NeonFrame from "./neon";
import SakuraFrame from "./sakura";
import GatoFrame from "./gato";
import EnredaderaFrame from "./enredadera";
import OscuridadFrame from "./oscuridad";
import TormentaFrame from "./tormenta";
import DragonFrame from "./dragon";
import FenixFrame from "./fenix";
import GalaxiaFrame from "./galaxia";
import CoronaFrame from "./corona";

export type { FrameProps };
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type FrameDef = {
  id: string;
  name: string;
  rarity: Rarity | "achievement";
  /** Draws the frame; animated only when `animated !== false && size >= 56`. */
  Frame: (p: FrameProps) => JSX.Element;
};

export const FRAMES: FrameDef[] = [
  // Achievement frames (ids = constellation ids)
  { id: "ritmo", name: "Aurora", rarity: "achievement", Frame: SunFrame },
  { id: "constancia", name: "Llama eterna", rarity: "achievement", Frame: FlameFrame },
  { id: "enfoque", name: "Estrella polar", rarity: "achievement", Frame: FocusFrame },
  { id: "bienestar", name: "Laurel sereno", rarity: "achievement", Frame: LeavesFrame },
  { id: "conocimiento", name: "Códice", rarity: "achievement", Frame: PagesFrame },
  { id: "ascenso", name: "Cumbre", rarity: "achievement", Frame: PeaksFrame },
  // Common
  { id: "frame-halo", name: "Halo", rarity: "common", Frame: HaloFrame },
  { id: "frame-bronce", name: "Bronce", rarity: "common", Frame: BronceFrame },
  { id: "frame-hiedra", name: "Hiedra", rarity: "common", Frame: HiedraFrame },
  { id: "frame-puntos", name: "Constelación", rarity: "common", Frame: PuntosFrame },
  { id: "frame-petalo", name: "Pétalos", rarity: "common", Frame: PetaloFrame },
  // Rare
  { id: "frame-cristal", name: "Cristal", rarity: "rare", Frame: CristalFrame },
  { id: "frame-orbita", name: "Órbita", rarity: "rare", Frame: OrbitaFrame },
  { id: "frame-llamas", name: "Llamas", rarity: "rare", Frame: LlamasFrame },
  { id: "frame-escarcha", name: "Escarcha", rarity: "rare", Frame: EscarchaFrame },
  { id: "frame-neon", name: "Neón", rarity: "rare", Frame: NeonFrame },
  { id: "frame-sakura", name: "Sakura", rarity: "rare", Frame: SakuraFrame },
  // Epic
  { id: "frame-gato", name: "Gatito", rarity: "epic", Frame: GatoFrame },
  { id: "frame-enredadera", name: "Jardín secreto", rarity: "epic", Frame: EnredaderaFrame },
  { id: "frame-oscuridad", name: "Oscuridad", rarity: "epic", Frame: OscuridadFrame },
  { id: "frame-tormenta", name: "Tormenta", rarity: "epic", Frame: TormentaFrame },
  // Legendary
  { id: "frame-dragon", name: "Dragón", rarity: "legendary", Frame: DragonFrame },
  { id: "frame-fenix", name: "Fénix", rarity: "legendary", Frame: FenixFrame },
  { id: "frame-galaxia", name: "Galaxia", rarity: "legendary", Frame: GalaxiaFrame },
  { id: "frame-corona", name: "Corona celestial", rarity: "legendary", Frame: CoronaFrame },
];

const BY_ID = new Map(FRAMES.map((d) => [d.id, d]));

/** Any frame (achievement or shop) by id. */
export const frameById = (id: string | null | undefined): FrameDef | undefined => (id ? BY_ID.get(id) : undefined);
