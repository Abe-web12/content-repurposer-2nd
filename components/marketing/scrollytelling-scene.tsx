"use client";

import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, Sparkles, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMediaQuery } from "@/hooks/use-media-query";

gsap.registerPlugin(ScrollTrigger);

const COLOR_CONFIGS = [
  { id: "hero", accent: new THREE.Color("#818cf8"), bg: "10,10,30", emissive: new THREE.Color("#4f46e5") },
  { id: "social-proof", accent: new THREE.Color("#c084fc"), bg: "15,8,26", emissive: new THREE.Color("#7c3aed") },
  { id: "how-it-works", accent: new THREE.Color("#22d3ee"), bg: "8,15,26", emissive: new THREE.Color("#0891b2") },
  { id: "features", accent: new THREE.Color("#818cf8"), bg: "10,10,26", emissive: new THREE.Color("#4f46e5") },
  { id: "pricing", accent: new THREE.Color("#e879f9"), bg: "15,10,26", emissive: new THREE.Color("#a21caf") },
  { id: "faq", accent: new THREE.Color("#f472b6"), bg: "10,8,20", emissive: new THREE.Color("#db2777") },
  { id: "cta", accent: new THREE.Color("#6366f1"), bg: "8,8,22", emissive: new THREE.Color("#4338ca") },
];

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

// ─── Repurposing Core (procedural fallback) ───
function RepurposingCore({ progressRef }: { progressRef: { current: number } }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const targetScale = useRef(1);
  const targetEmissiveIntensity = useRef(0.4);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const fragmentScale = Math.max(0.15, 1 - p * 1.2);
    const breathing = Math.sin(t * (1 + p * 2)) * (0.02 + p * 0.03);
    meshRef.current.scale.setScalar(
      fragmentScale + (targetScale.current - fragmentScale) * 0.08 + breathing
    );
    meshRef.current.rotation.x = p * 0.8 + Math.sin(t * 0.3) * 0.05;
    meshRef.current.rotation.y = t * (0.2 + p * 0.3);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity += (targetEmissiveIntensity.current - mat.emissiveIntensity) * 0.08;
    mat.opacity = Math.max(0.2, 1 - p * 0.8);

    const sectionIndex = Math.min(Math.floor(p * COLOR_CONFIGS.length), COLOR_CONFIGS.length - 1);
    mat.color.lerp(COLOR_CONFIGS[sectionIndex].accent, 0.04);
    mat.emissive.lerp(COLOR_CONFIGS[sectionIndex].emissive, 0.04);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <mesh
        ref={meshRef}
        onPointerOver={() => {
          targetScale.current = 1.3;
          targetEmissiveIntensity.current = 1.0;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          targetScale.current = Math.max(0.15, 1 - progressRef.current * 1.2);
          targetEmissiveIntensity.current = 0.4;
          document.body.style.cursor = "default";
        }}
      >
        <torusKnotGeometry args={[0.5, 0.18, 100, 20]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#4f46e5"
          emissiveIntensity={0.4}
          roughness={0.15}
          metalness={0.8}
          transparent
          opacity={1}
        />
      </mesh>
    </Float>
  );
}

// ─── Format Fragment ───
function FormatFragment({
  index,
  total,
  baseRadius,
  progressRef,
  color,
  geometryType,
}: {
  index: number;
  total: number;
  baseRadius: number;
  progressRef: { current: number };
  color: string;
  geometryType: "box" | "flat" | "tube";
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const targetScale = useRef(0);
  const targetEmissive = useRef(0.1);
  const angleOffset = useMemo(() => (index / total) * Math.PI * 2, [index, total]);
  const emergeStart = useMemo(() => 0.08 + (index / total) * 0.06, [index, total]);

  const geo = useMemo(() => {
    switch (geometryType) {
      case "box": return <boxGeometry args={[0.08, 0.08, 0.08]} />;
      case "flat": return <boxGeometry args={[0.2, 0.03, 0.1]} />;
      case "tube": return <torusGeometry args={[0.06, 0.025, 8, 12]} />;
    }
  }, [geometryType]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const emergeFactor = Math.max(0, Math.min(1, (p - emergeStart) / 0.25));
    const visible = emergeFactor > 0;
    meshRef.current.visible = visible;

    if (visible) {
      const speed = 0.4 + (index % 3) * 0.2;
      const angle = t * speed + angleOffset + p * 0.5;
      const radius = baseRadius + p * 1.8;

      meshRef.current.position.x = Math.cos(angle) * radius;
      meshRef.current.position.z = Math.sin(angle) * radius * 0.7;
      meshRef.current.position.y = Math.sin(t * 0.7 + index) * 0.3 + p * 0.3;

      const scale = emergeFactor * 0.12 + targetScale.current * 1.5;
      meshRef.current.scale.setScalar(scale);

      meshRef.current.rotation.x = t * speed;
      meshRef.current.rotation.y = t * speed * 0.6;

      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity += (targetEmissive.current - mat.emissiveIntensity) * 0.08;
      mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.1 + emergeFactor * 0.3 + Math.sin(t + index) * 0.05);
    }
  });

  return (
    <mesh
      ref={meshRef}
      visible={false}
      onPointerOver={() => {
        targetScale.current = 2.0;
        targetEmissive.current = 1.2;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        targetScale.current = 0;
        targetEmissive.current = 0.1;
        document.body.style.cursor = "default";
      }}
    >
      {geo}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.1}
        roughness={0.25}
        metalness={0.6}
      />
    </mesh>
  );
}

// ─── Semantic satellites ───
function MicrophoneSatellite({ progressRef }: { progressRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current || !matRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const fadeOut = Math.max(0, 1 - p * 4);
    matRef.current.opacity = fadeOut;
    groupRef.current.visible = fadeOut > 0.01;

    if (fadeOut <= 0.01) return;

    const angle = t * 0.3 + p * 0.2;
    const radius = 2.2 - p * 0.5;
    groupRef.current.position.x = Math.cos(angle) * radius + pointer.x * 0.15;
    groupRef.current.position.z = Math.sin(angle) * radius * 0.5;
    groupRef.current.position.y = 0.8 + Math.sin(t * 0.4) * 0.2;
    groupRef.current.rotation.z = 0.3 + Math.sin(t * 0.2) * 0.05;
    groupRef.current.scale.setScalar(0.7);
  });

  return (
    <group ref={groupRef} position={[-2.2, 0.8, -1]}>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial ref={matRef} color="#a78bfa" roughness={0.2} metalness={0.7} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.3} metalness={0.5} transparent opacity={1} />
      </mesh>
    </group>
  );
}

function DocumentStackSatellite({ progressRef }: { progressRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const appear = Math.max(0, Math.min(1, (p - 0.12) / 0.15));
    const fadeOut = Math.max(0, 1 - Math.max(0, (p - 0.7) / 0.15));
    const visibility = Math.min(appear, fadeOut);
    groupRef.current.visible = visibility > 0.01;

    if (visibility <= 0.01) return;

    const angle = t * 0.25 + 1.5 + p * 0.3;
    const radius = 1.8 + p * 0.8;
    groupRef.current.position.x = Math.cos(angle) * radius + pointer.x * 0.1;
    groupRef.current.position.z = Math.sin(angle) * radius * 0.6;
    groupRef.current.position.y = -0.3 + Math.sin(t * 0.3 + 1) * 0.2 + p * 0.5;
    groupRef.current.rotation.y = t * 0.2 + p * 0.5;
    groupRef.current.scale.setScalar(0.7 + visibility * 0.3);
  });

  const docColors = ["#c7d2fe", "#818cf8", "#6366f1"];

  return (
    <group ref={groupRef} position={[1.8, -0.3, -1.5]}>
      {[0, 0.15, 0.3].map((offset, i) => (
        <mesh key={i} position={[i * 0.04, offset, -i * 0.04]} rotation={[0, 0.08 * i, 0]}>
          <boxGeometry args={[0.9, 0.04, 1.2]} />
          <meshStandardMaterial color={docColors[i]} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function SpeechBubbleSatellite({ progressRef }: { progressRef: { current: number } }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const appear = Math.max(0, Math.min(1, (p - 0.25) / 0.15));
    ref.current.visible = appear > 0.01;

    if (appear <= 0.01) return;

    const angle = t * 0.2 + 3.0 + p * 0.4;
    const radius = 2.0 + p * 0.6;
    ref.current.position.x = Math.cos(angle) * radius + pointer.x * 0.1;
    ref.current.position.z = Math.sin(angle) * radius * 0.5;
    ref.current.position.y = 1.2 + Math.sin(t * 0.35 + 2) * 0.25 + p * 0.4;
    ref.current.scale.setScalar(0.6 + appear * 0.4);
    ref.current.rotation.y = t * 0.15;
  });

  return (
    <mesh ref={ref} position={[2.0, 1.2, -2.5]}>
      <sphereGeometry args={[0.45, 12, 12]} />
      <meshStandardMaterial
        color="#f0abfc"
        roughness={0.1}
        metalness={0.6}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// ─── GLB Model Scene (loaded when /model.glb exists) ───
function GLBModelInner({ progressRef }: { progressRef: { current: number } }) {
  const { scene } = useGLTF("/model.glb");
  const groupRef = useRef<THREE.Group>(null!);
  const targetScaleBoost = useRef(0);
  const targetEmissiveBoost = useRef(0);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    groupRef.current.rotation.y = t * 0.08 + p * 0.5;
    groupRef.current.rotation.x = p * 0.4 + Math.sin(t * 0.15) * 0.03;
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.12 - p * 0.6;
    groupRef.current.position.x = p * 0.3;

    const baseScale = Math.max(0.6, 1 - p * 0.3);
    const hoverScale = targetScaleBoost.current * 0.2;
    groupRef.current.scale.setScalar(baseScale + hoverScale);

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          const target = 0.1 + p * 0.3 + targetEmissiveBoost.current * 0.8;
          mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.06;
        }
      }
    });
  });

  return (
    <primitive
      ref={groupRef}
      object={clonedScene}
      onPointerOver={() => {
        targetScaleBoost.current = 1;
        targetEmissiveBoost.current = 1;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        targetScaleBoost.current = 0;
        targetEmissiveBoost.current = 0;
        document.body.style.cursor = "default";
      }}
    />
  );
}

// ─── Procedural scene content ───
function ProceduralSceneContent({
  progressRef,
  isTablet,
}: {
  progressRef: { current: number };
  isTablet: boolean;
}) {
  const linkedinCount = isTablet ? 5 : 8;
  const twitterCount = isTablet ? 6 : 10;
  const carouselCount = isTablet ? 5 : 8;

  return (
    <>
      <RepurposingCore progressRef={progressRef} />

      {Array.from({ length: linkedinCount }).map((_, i) => (
        <FormatFragment
          key={`linkedin-${i}`}
          index={i}
          total={linkedinCount}
          baseRadius={0.7}
          progressRef={progressRef}
          color="#818cf8"
          geometryType="flat"
        />
      ))}

      {Array.from({ length: twitterCount }).map((_, i) => (
        <FormatFragment
          key={`twitter-${i}`}
          index={i}
          total={twitterCount}
          baseRadius={1.0}
          progressRef={progressRef}
          color="#22d3ee"
          geometryType="box"
        />
      ))}

      {Array.from({ length: carouselCount }).map((_, i) => (
        <FormatFragment
          key={`carousel-${i}`}
          index={i}
          total={carouselCount}
          baseRadius={1.3}
          progressRef={progressRef}
          color="#e879f9"
          geometryType="tube"
        />
      ))}

      <MicrophoneSatellite progressRef={progressRef} />
      <DocumentStackSatellite progressRef={progressRef} />
      <SpeechBubbleSatellite progressRef={progressRef} />
    </>
  );
}

// ─── Loading Fallback ───
function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 border-r-indigo-500/40 border-b-indigo-500/20 border-l-indigo-500/30 animate-spin" />
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
        </div>
        <p className="text-sm font-medium tracking-wider text-indigo-300/60 uppercase">
          Initializing 3D Scene
        </p>
      </div>
    </div>
  );
}

// ─── Scene Core ───
function SceneCore({
  progressRef,
  isTablet,
}: {
  progressRef: { current: number };
  isTablet: boolean;
}) {
  const [useGLB, setUseGLB] = useState(false);
  const [glbChecked, setGlbChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/model.glb", { method: "HEAD" })
      .then((r) => {
        if (!cancelled) {
          setUseGLB(r.ok);
          setGlbChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUseGLB(false);
          setGlbChecked(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const sparkleCount = isTablet ? 30 : 80;
  const contactShadowOpacity = isTablet ? 0.2 : 0.35;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#e0e7ff" />
      <pointLight position={[-3, 2, 2]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[3, -1, 3]} intensity={0.3} color="#6366f1" />
      <pointLight position={[0, -3, 1]} intensity={0.2} color="#06b6d4" />

      {useGLB ? (
        <Suspense fallback={null}>
          <GLBModelInner progressRef={progressRef} />
        </Suspense>
      ) : (
        <ProceduralSceneContent progressRef={progressRef} isTablet={isTablet} />
      )}

      <Sparkles
        count={sparkleCount}
        scale={8}
        size={0.025}
        speed={0.3}
        color="#a5b4fc"
        opacity={0.5}
      />

      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={contactShadowOpacity}
        scale={8}
        blur={3}
        far={3}
      />

      <Environment preset="night" />
    </>
  );
}

export function ScrollytellingScene() {
  const progressRef = useRef(0);
  const isTablet = useMediaQuery("(max-width: 1024px)");

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });

      COLOR_CONFIGS.forEach(({ id, accent, bg }) => {
        const el = document.getElementById(id);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top 75%",
          end: "bottom 25%",
          onToggle: ({ isActive }) => {
            if (isActive) {
              gsap.to(document.documentElement, {
                "--section-accent": `#${accent.getHexString()}`,
                "--section-bg": bg,
                duration: 0.6,
                ease: "power2.out",
              });
            }
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="pointer-events-auto h-full w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [0, 0, 5.5], fov: 45 }}
            dpr={isTablet ? [1, 1.2] : [1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
            style={{ background: "transparent" }}
          >
            <SceneCore progressRef={progressRef} isTablet={isTablet} />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
}
