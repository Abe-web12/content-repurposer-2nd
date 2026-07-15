"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// 3D Microphone-like shape (cylinder + sphere)
function Microphone({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);

  useFrame(({ pointer }) => {
    if (group.current) {
      group.current.rotation.z += 0.002;
      group.current.position.x += (pointer.x * 0.3 - group.current.position.x + position[0]) * 0.015;
      group.current.position.y += (pointer.y * 0.2 - group.current.position.y + position[1]) * 0.015;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.6}>
      <group ref={group} position={position} rotation={[0, 0, 0.3]}>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#a78bfa" roughness={0.2} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 1, 12]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

// Stacked document layers
function DocumentStack({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);

  useFrame(({ pointer }) => {
    if (group.current) {
      group.current.rotation.y += 0.004;
      group.current.rotation.x = pointer.y * 0.1;
      group.current.position.x += (pointer.x * -0.2 - group.current.position.x + position[0]) * 0.012;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
      <group ref={group} position={position}>
        {[0, 0.2, 0.4].map((offset, i) => (
          <mesh key={i} position={[i * 0.05, offset, -i * 0.05]} rotation={[0, 0.1 * i, 0]}>
            <boxGeometry args={[1.2, 0.05, 1.6]} />
            <meshStandardMaterial
              color={i === 2 ? "#6366f1" : i === 1 ? "#818cf8" : "#c7d2fe"}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

// Speech bubble shape
function SpeechBubble({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ pointer }) => {
    if (ref.current) {
      ref.current.rotation.y += 0.003;
      ref.current.position.x += (pointer.x * 0.4 - ref.current.position.x + position[0]) * 0.01;
      ref.current.position.y += (pointer.y * 0.15 - ref.current.position.y + position[1]) * 0.01;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.7}>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color="#f0abfc"
          roughness={0.1}
          metalness={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
}

// Particles (subtle, slow-drifting)
function Particles({ count = 300 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame(({ pointer }) => {
    if (ref.current) {
      ref.current.rotation.y += 0.0002;
      ref.current.rotation.x = pointer.y * 0.03;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.04} color="#a5b4fc" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} color="#e0e7ff" />
      <pointLight position={[-4, 2, 3]} intensity={0.8} color="#7c3aed" />
      <pointLight position={[3, -2, -2]} intensity={0.4} color="#6366f1" />

      <Microphone position={[-3, 1.2, -2]} />
      <DocumentStack position={[2.8, -0.3, -1.5]} />
      <SpeechBubble position={[1, 2.2, -3]} />

      <Particles count={300} />
      <Environment preset="night" />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
