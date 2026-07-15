"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function Model() {
  const group = useRef<THREE.Group>(null!);
  const { scene } = useGLTF("/model.glb");

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y += 0.003;
    group.current.position.y += Math.sin(t * 0.5) * 0.002;
  });

  useEffect(() => {
    if (!group.current) return;

    const model = group.current;
    const initialY = model.position.y;
    const initialScale = model.scale.x;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          model.rotation.x = p * THREE.MathUtils.degToRad(25);
          model.rotation.z = p * THREE.MathUtils.degToRad(-10);
          model.position.y = initialY - p * 1.5;
          model.position.x = p * 0.8;
          model.scale.setScalar(initialScale - p * 0.25);
        },
      });

      const configs = [
        { id: "hero", accent: "#818cf8", bg: "10,10,30" },
        { id: "social-proof", accent: "#a78bfa", bg: "15,8,26" },
        { id: "how-it-works", accent: "#22d3ee", bg: "8,15,26" },
        { id: "features", accent: "#818cf8", bg: "10,10,26" },
        { id: "pricing", accent: "#c4b5fd", bg: "15,10,26" },
        { id: "faq", accent: "#f472b6", bg: "10,8,20" },
        { id: "cta", accent: "#6366f1", bg: "8,8,22" },
      ];

      configs.forEach(({ id, accent, bg }) => {
        const el = document.getElementById(id);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top 75%",
          end: "bottom 25%",
          onToggle: ({ isActive }) => {
            if (isActive) {
              gsap.to(document.documentElement, {
                "--section-accent": accent,
                "--section-bg": bg,
                duration: 0.6,
                ease: "power2.out",
              });
              model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                  const mat = child.material as THREE.MeshStandardMaterial;
                  if (mat.color) {
                    gsap.to(mat.color, {
                      r: new THREE.Color(accent).r,
                      g: new THREE.Color(accent).g,
                      b: new THREE.Color(accent).b,
                      duration: 0.8,
                      ease: "power2.out",
                    });
                  }
                }
              });
            }
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return <primitive ref={group} object={scene} />;
}

function LoadingFallback() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs font-medium tracking-widest text-white/40 uppercase">
          {Math.round(progress)}%
        </p>
      </div>
    </Html>
  );
}

function FallbackShapes() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.005;
    ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.15;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}>
        <torusKnotGeometry args={[0.5, 0.15, 100, 16]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[1.2, -0.4, -0.8]}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[-1.1, 0.3, -1]}>
        <icosahedronGeometry args={[0.25]} />
        <meshStandardMaterial
          color="#f0abfc"
          emissive="#ec4899"
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        color="#e0e7ff"
      />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#7c3aed" />
      <pointLight position={[3, -1, 3]} intensity={0.4} color="#6366f1" />

      <Suspense fallback={<FallbackShapes />}>
        <Model />
      </Suspense>
    </>
  );
}

export function GLBScene() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
