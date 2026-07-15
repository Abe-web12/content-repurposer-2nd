"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMediaQuery } from "@/hooks/use-media-query";

gsap.registerPlugin(ScrollTrigger);

function FloatingShape({
  geometry,
  position,
  color,
  emissive,
  speed = 1,
  scrollFactor = 1,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  color: string;
  emissive?: string;
  speed?: number;
  scrollFactor?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const initialPos = useRef(new THREE.Vector3(...position));
  const scrollOffset = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollOffset.current = self.progress * scrollFactor;
        },
      });
    });

    return () => ctx.revert();
  }, [scrollFactor]);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;

    const t = clock.getElapsedTime() * speed;

    ref.current.rotation.x += 0.003;
    ref.current.rotation.y += 0.005;
    ref.current.position.y =
      initialPos.current.y + Math.sin(t) * 0.4 + scrollOffset.current * 2;
    ref.current.position.x =
      initialPos.current.x +
      Math.sin(t * 0.7) * 0.3 +
      pointer.x * 0.2 +
      scrollOffset.current * 1.5;
    ref.current.position.z =
      initialPos.current.z +
      Math.cos(t * 0.5) * 0.3 +
      pointer.y * 0.2 -
      scrollOffset.current * 3;
  });

  return (
    <mesh ref={ref} geometry={geometry} position={position}>
      <meshStandardMaterial
        color={color}
        emissive={emissive || color}
        emissiveIntensity={0.15}
        roughness={0.3}
        metalness={0.6}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function ParticleField({ count = 400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const scrollOffset = useRef(0);

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
      const shade = 0.4 + Math.random() * 0.6;
      col[i * 3] = 0.4 * shade;
      col[i * 3 + 1] = 0.3 * shade;
      col[i * 3 + 2] = 0.9 * shade;
      siz[i] = 0.02 + Math.random() * 0.04;
    }
    return { positions: pos, colors: col, sizes: siz };
  }, [count]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollOffset.current = self.progress;
        },
      });
    });
    return () => ctx.revert();
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.15;
    ref.current.rotation.y = t * 0.1 + scrollOffset.current * 2;
    ref.current.rotation.x =
      Math.sin(t * 0.3) * 0.05 + scrollOffset.current * 0.5;
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    return g;
  }, [positions, colors, sizes]);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function SceneCore() {
  const { height } = useThree((s) => s.viewport);
  const spread = height * 0.4;

  const shapes = useMemo(
    () => [
      {
        geo: new THREE.TorusKnotGeometry(0.35, 0.12, 64, 16),
        pos: [-spread * 0.5, spread * 0.25, -2] as [number, number, number],
        color: "#818cf8",
        emissive: "#6366f1",
        speed: 0.6,
        factor: 0.3,
      },
      {
        geo: new THREE.OctahedronGeometry(0.4),
        pos: [spread * 0.6, spread * 0.15, -4] as [number, number, number],
        color: "#a78bfa",
        emissive: "#8b5cf6",
        speed: 0.8,
        factor: 0.5,
      },
      {
        geo: new THREE.IcosahedronGeometry(0.35),
        pos: [-spread * 0.3, -spread * 0.15, -3] as [number, number, number],
        color: "#f0abfc",
        emissive: "#ec4899",
        speed: 0.7,
        factor: 0.4,
      },
      {
        geo: new THREE.TorusGeometry(0.3, 0.1, 24, 48),
        pos: [spread * 0.4, -spread * 0.2, -5] as [number, number, number],
        color: "#67e8f9",
        emissive: "#06b6d4",
        speed: 0.5,
        factor: 0.6,
      },
      {
        geo: new THREE.DodecahedronGeometry(0.3),
        pos: [0, spread * 0.35, -6] as [number, number, number],
        color: "#c4b5fd",
        emissive: "#7c3aed",
        speed: 0.9,
        factor: 0.7,
      },
      {
        geo: new THREE.CylinderGeometry(0.15, 0.25, 0.4, 8),
        pos: [-spread * 0.7, -spread * 0.3, -4.5] as [number, number, number],
        color: "#f472b6",
        emissive: "#db2777",
        speed: 0.6,
        factor: 0.35,
      },
    ],
    [spread]
  );

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#e0e7ff" />
      <pointLight position={[-4, 3, 2]} intensity={0.6} color="#7c3aed" />
      <pointLight position={[4, -2, 3]} intensity={0.3} color="#6366f1" />
      <pointLight position={[0, -4, -2]} intensity={0.4} color="#06b6d4" />

      {shapes.map((s, i) => (
        <FloatingShape
          key={i}
          geometry={s.geo}
          position={s.pos}
          color={s.color}
          emissive={s.emissive}
          speed={s.speed}
          scrollFactor={s.factor}
        />
      ))}

      <ParticleField count={400} />
      <Environment preset="night" />
    </>
  );
}

function Scene3DCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      dpr={[1, 1.2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <SceneCore />
    </Canvas>
  );
}

export function Scene3D() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isDesktop) return null;

  return (
    <div className="absolute inset-0 -z-10">
      <Scene3DCanvas />
    </div>
  );
}
