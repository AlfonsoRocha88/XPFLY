import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { AvatarConfig, getOutfit } from "@/lib/avatar-presets";

interface Avatar3DProps {
  config: AvatarConfig;
  outfitId?: string | null;
  classGlow?: string | null;
  size?: number;
  interactive?: boolean;
}

/* -------- Hair meshes -------- */
function Hair({ style, color, headRadius }: { style: string; color: string; headRadius: number }) {
  const c = new THREE.Color(color);
  if (style === "bald") return null;

  const common = <meshStandardMaterial color={c} roughness={0.55} metalness={0.05} />;

  switch (style) {
    case "spiky":
      return (
        <group>
          <mesh position={[0, headRadius * 0.55, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.02, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {common}
          </mesh>
          {[...Array(7)].map((_, i) => {
            const a = (i / 7) * Math.PI * 2;
            const r = headRadius * 0.7;
            return (
              <mesh key={i} position={[Math.cos(a) * r, headRadius * 1.05, Math.sin(a) * r]} rotation={[0, 0, 0]} castShadow>
                <coneGeometry args={[headRadius * 0.18, headRadius * 0.55, 6]} />
                {common}
              </mesh>
            );
          })}
        </group>
      );
    case "long":
      return (
        <group>
          <mesh position={[0, headRadius * 0.45, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.05, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
            {common}
          </mesh>
          <mesh position={[0, -headRadius * 0.4, -headRadius * 0.15]} castShadow>
            <boxGeometry args={[headRadius * 1.6, headRadius * 1.4, headRadius * 0.4]} />
            {common}
          </mesh>
        </group>
      );
    case "ponytail":
      return (
        <group>
          <mesh position={[0, headRadius * 0.55, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.02, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {common}
          </mesh>
          <mesh position={[0, -headRadius * 0.1, -headRadius * 0.95]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[headRadius * 0.18, headRadius * 0.08, headRadius * 1.4, 8]} />
            {common}
          </mesh>
        </group>
      );
    case "bangs":
      return (
        <group>
          <mesh position={[0, headRadius * 0.55, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.02, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {common}
          </mesh>
          <mesh position={[0, headRadius * 0.35, headRadius * 0.85]} castShadow>
            <boxGeometry args={[headRadius * 1.7, headRadius * 0.5, headRadius * 0.25]} />
            {common}
          </mesh>
        </group>
      );
    case "messy":
      return (
        <group>
          <mesh position={[0, headRadius * 0.55, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            {common}
          </mesh>
          {[...Array(5)].map((_, i) => (
            <mesh
              key={i}
              position={[Math.sin(i * 1.7) * headRadius * 0.6, headRadius * (0.95 + (i % 2) * 0.1), Math.cos(i * 1.7) * headRadius * 0.6]}
              rotation={[Math.sin(i), Math.cos(i), 0]}
              castShadow
            >
              <boxGeometry args={[headRadius * 0.25, headRadius * 0.35, headRadius * 0.18]} />
              {common}
            </mesh>
          ))}
        </group>
      );
    case "mohawk":
      return (
        <group>
          <mesh position={[0, headRadius * 0.55, 0]} castShadow>
            <sphereGeometry args={[headRadius * 1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
            {common}
          </mesh>
          <mesh position={[0, headRadius * 1.2, 0]} castShadow>
            <boxGeometry args={[headRadius * 0.25, headRadius * 0.7, headRadius * 1.7]} />
            {common}
          </mesh>
        </group>
      );
    case "short":
    default:
      return (
        <mesh position={[0, headRadius * 0.55, 0]} castShadow>
          <sphereGeometry args={[headRadius * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          {common}
        </mesh>
      );
  }
}

/* -------- Eyes -------- */
function Eyes({ style, color, headRadius }: { style: string; color: string; headRadius: number }) {
  const c = new THREE.Color(color);
  const eyeY = headRadius * 0.1;
  const eyeZ = headRadius * 0.92;
  const eyeX = headRadius * 0.32;
  const size =
    style === "big" ? headRadius * 0.16 :
    style === "sharp" ? headRadius * 0.1 :
    style === "closed" ? headRadius * 0.04 :
    headRadius * 0.12;

  if (style === "closed") {
    return (
      <group>
        {[-eyeX, eyeX].map((x, i) => (
          <mesh key={i} position={[x, eyeY, eyeZ]}>
            <boxGeometry args={[headRadius * 0.28, size, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      {[-eyeX, eyeX].map((x, i) => (
        <group key={i} position={[x, eyeY, eyeZ]}>
          {/* Sclera */}
          <mesh>
            <sphereGeometry args={[size * 1.1, 12, 10]} />
            <meshStandardMaterial color="#fafafa" roughness={0.2} />
          </mesh>
          {/* Iris */}
          <mesh position={[0, 0, size * 0.5]}>
            <sphereGeometry args={[size * 0.7, 12, 10]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={style === "glow" ? 0.8 : 0.15}
              roughness={0.3}
            />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, size * 0.85]}>
            <sphereGeometry args={[size * 0.3, 10, 8]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------- Avatar mesh -------- */
function AvatarMesh({ config, outfitId, classGlow }: { config: AvatarConfig; outfitId?: string | null; classGlow?: string | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  const outfit = useMemo(() => getOutfit(outfitId ?? config.outfit), [outfitId, config.outfit]);

  // Idle animation — must remember the base offset so we don't override it.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.position.y = yOffset + Math.sin(t * 1.5) * 0.04;
    if (torsoRef.current) torsoRef.current.rotation.y = Math.sin(t * 0.8) * 0.08;
    if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * 1.5) * 0.1;
    if (rightArm.current) rightArm.current.rotation.x = -Math.sin(t * 1.5) * 0.1;
  });

  // Proportions — height scales BODY only; head stays anatomically proportional to its connection.
  // Crucially: the neck length follows torsoHeight scale, so head never disconnects.
  const baseH = 1.0;
  const h = config.height; // 0.85..1.15
  const skin = new THREE.Color(config.skinColor);
  const outfitMain = new THREE.Color(outfit.color);
  const outfitAccent = new THREE.Color(outfit.accent);
  const outfitTrim = new THREE.Color((outfit as any).trim ?? outfit.accent);

  // Body part dims (relative units, then everything scales with h)
  const headR = 0.34;
  const torsoH = 0.85 * h;
  const torsoW = 0.55;
  const torsoD = 0.32;
  const neckH = 0.12 * h;        // <-- scales with height to stay connected
  const neckR = 0.13;
  const armH = 0.75 * h;
  const armR = 0.1;
  const legH = 0.85 * h;
  const legR = 0.13;

  // Y positions, building from feet up
  const legY = legH / 2;
  const hipY = legH;
  const torsoY = hipY + torsoH / 2;
  const shoulderY = hipY + torsoH * 0.92;
  const neckY = hipY + torsoH + neckH / 2;
  const headY = hipY + torsoH + neckH + headR;

  // Total body height (feet to top of head).
  // Center the model around y=0 so it always fits the camera frame
  // regardless of the height slider.
  const totalH = legH + torsoH + neckH + headR * 2;
  const yOffset = -totalH / 2;

  return (
    <group ref={groupRef} position={[0, yOffset, 0]}>
      {/* Class aura */}
      {classGlow && (
        <pointLight position={[0, torsoY, 0.6]} color={classGlow} intensity={1.8} distance={3} />
      )}

      {/* Legs */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={i} position={[x, legY, 0]} castShadow>
          <cylinderGeometry args={[legR, legR * 0.85, legH, 12]} />
          <meshStandardMaterial color={outfitMain} roughness={0.7} />
        </mesh>
      ))}

      {/* Boots */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={i} position={[x, 0.06, 0.04]} castShadow>
          <boxGeometry args={[0.28, 0.13, 0.36]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
      ))}

      {/* Torso (group rotates for idle sway) */}
      <group ref={torsoRef} position={[0, torsoY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[torsoW, torsoH, torsoD]} />
          <meshStandardMaterial color={outfitMain} roughness={0.6} />
        </mesh>
        {/* Chest accent stripe */}
        <mesh position={[0, torsoH * 0.1, torsoD / 2 + 0.001]}>
          <boxGeometry args={[torsoW * 0.85, torsoH * 0.15, 0.01]} />
          <meshStandardMaterial color={outfitAccent} emissive={outfitAccent} emissiveIntensity={0.4} />
        </mesh>
        {/* Belt */}
        <mesh position={[0, -torsoH * 0.45, 0]}>
          <boxGeometry args={[torsoW * 1.02, 0.06, torsoD * 1.02]} />
          <meshStandardMaterial color={outfitTrim} metalness={0.5} roughness={0.3} />
        </mesh>
      </group>

      {/* Arms — anchored at shoulders (relative to world, not torso, but movement is subtle) */}
      <group ref={leftArm} position={[-torsoW / 2 - armR * 0.6, shoulderY, 0]}>
        <mesh position={[0, -armH / 2, 0]} castShadow>
          <cylinderGeometry args={[armR, armR * 0.85, armH, 10]} />
          <meshStandardMaterial color={outfitMain} roughness={0.6} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -armH - 0.05, 0]} castShadow>
          <sphereGeometry args={[armR * 0.95, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightArm} position={[torsoW / 2 + armR * 0.6, shoulderY, 0]}>
        <mesh position={[0, -armH / 2, 0]} castShadow>
          <cylinderGeometry args={[armR, armR * 0.85, armH, 10]} />
          <meshStandardMaterial color={outfitMain} roughness={0.6} />
        </mesh>
        <mesh position={[0, -armH - 0.05, 0]} castShadow>
          <sphereGeometry args={[armR * 0.95, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>

      {/* Neck — guaranteed connected: it spans torso top to head bottom */}
      <mesh position={[0, neckY, 0]} castShadow>
        <cylinderGeometry args={[neckR, neckR * 1.1, neckH + 0.02, 12]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* Head */}
      <group position={[0, headY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[headR, 24, 20]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
        {/* Face shape variation via subtle scale */}
        <Hair style={config.hairStyle} color={config.hairColor} headRadius={headR} />
        <Eyes style={config.eyeStyle} color={config.eyeColor} headRadius={headR} />
        {/* Mouth */}
        <mesh position={[0, -headR * 0.35, headR * 0.92]}>
          <boxGeometry args={[headR * 0.3, headR * 0.04, 0.01]} />
          <meshStandardMaterial color="#3a1a1a" />
        </mesh>
      </group>
    </group>
  );
}

const Avatar3D = ({ config, outfitId, classGlow, size = 320, interactive = true }: Avatar3DProps) => {
  return (
    <div style={{ width: size, height: size }} className="rounded-xl overflow-hidden">
      <Canvas shadows camera={{ position: [0, 0, 4.2], fov: 50, near: 0.1, far: 100 }} dpr={[1, 2]}>
        <color attach="background" args={["#0a1020"]} />
        <fog attach="fog" args={["#0a1020", 8, 14]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#7dd3fc" />
        <Suspense fallback={null}>
          <AvatarMesh config={config} outfitId={outfitId} classGlow={classGlow} />
          <ContactShadows position={[0, -1.45, 0]} opacity={0.55} blur={2.4} scale={4.5} />
          <Environment preset="city" />
        </Suspense>
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 1.7}
            target={[0, 0, 0]}
          />
        )}
      </Canvas>
    </div>
  );
};

export default Avatar3D;
