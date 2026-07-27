'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  auroraFragmentShader,
  fullscreenVertexShader,
  shapeFragmentShader,
  shapeVertexShader,
} from './shaders';
import { usePerformanceTier, usePrefersReducedMotion } from '@/hooks/useEnvironment';

interface HeroCanvasProps {
  accent?: string;
  highlight?: string;
  className?: string;
}

/** Full-screen aurora field. Renders behind everything else in the scene. */
function AuroraField({ accent, highlight, octaves }: { accent: string; highlight: string; octaves: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const pointer = useRef(new THREE.Vector2(0.5, 0.5));
  const target = useRef(new THREE.Vector2(0.5, 0.5));
  const force = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerForce: { value: 0 },
      uAccent: { value: new THREE.Color(accent) },
      uHighlight: { value: new THREE.Color(highlight) },
      uIntensity: { value: 1 },
      uScrollProgress: { value: 0 },
      uOctaves: { value: octaves },
    }),
    // Colours and octaves are pushed imperatively below; this only builds once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;

    target.current.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);

    const moved = pointer.current.distanceTo(target.current);
    force.current = THREE.MathUtils.damp(force.current, moved > 0.0015 ? 1 : 0.25, 2.4, delta);
    pointer.current.lerp(target.current, 1 - Math.exp(-6 * delta));

    material.uniforms.uTime!.value += delta;
    material.uniforms.uPointer!.value.copy(pointer.current);
    material.uniforms.uPointerForce!.value = force.current;
    material.uniforms.uResolution!.value.set(size.width, size.height);
    material.uniforms.uAccent!.value.set(accent);
    material.uniforms.uHighlight!.value.set(highlight);
    material.uniforms.uOctaves!.value = octaves;

    // Fade the field out as the hero scrolls away — the sections below stay black.
    const scrolled =
      typeof window === 'undefined' ? 0 : Math.min(window.scrollY / (window.innerHeight || 1), 1);
    material.uniforms.uScrollProgress!.value = THREE.MathUtils.damp(
      material.uniforms.uScrollProgress!.value,
      scrolled,
      4,
      delta,
    );
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={fullscreenVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

interface ShapeProps {
  position: [number, number, number];
  scale: number;
  detail: number;
  speed: number;
  amplitude: number;
  accent: string;
  highlight: string;
  opacity: number;
}

/** A displaced icosahedron drifting with parallax against the pointer. */
function FloatingShape({
  position,
  scale,
  detail,
  speed,
  amplitude,
  accent,
  highlight,
  opacity,
}: ShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const origin = useMemo(() => new THREE.Vector3(...position), [position]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: Math.random() * 40 },
      uAmplitude: { value: amplitude },
      uAccent: { value: new THREE.Color(accent) },
      uHighlight: { value: new THREE.Color(highlight) },
      uOpacity: { value: opacity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    material.uniforms.uTime!.value += delta * speed;
    material.uniforms.uAccent!.value.set(accent);
    material.uniforms.uHighlight!.value.set(highlight);

    mesh.rotation.x += delta * 0.06 * speed;
    mesh.rotation.y += delta * 0.09 * speed;

    // Depth-weighted parallax: nearer shapes travel further with the pointer.
    const depth = 1 + origin.z * 0.16;
    mesh.position.x = THREE.MathUtils.damp(
      mesh.position.x,
      origin.x + state.pointer.x * 0.55 * depth,
      2.2,
      delta,
    );
    mesh.position.y = THREE.MathUtils.damp(
      mesh.position.y,
      origin.y + state.pointer.y * 0.4 * depth + Math.sin(state.clock.elapsedTime * 0.4 + origin.x) * 0.12,
      2.2,
      delta,
    );
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <icosahedronGeometry args={[1, detail]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={shapeVertexShader}
        fragmentShader={shapeFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Scene({ accent, highlight, tier }: { accent: string; highlight: string; tier: 'low' | 'medium' | 'high' }) {
  const octaves = tier === 'low' ? 2 : tier === 'medium' ? 3 : 4;
  const detail = tier === 'low' ? 8 : tier === 'medium' ? 16 : 24;

  const shapes = useMemo<ShapeProps[]>(
    () => [
      { position: [-2.4, 0.9, -1.6], scale: 1.15, detail, speed: 0.55, amplitude: 0.34, accent, highlight, opacity: 0.55 },
      { position: [2.7, -0.7, -2.4], scale: 1.6, detail, speed: 0.4, amplitude: 0.28, accent: highlight, highlight: accent, opacity: 0.42 },
      { position: [0.6, 1.6, -3.2], scale: 0.8, detail, speed: 0.75, amplitude: 0.42, accent, highlight, opacity: 0.5 },
      ...(tier === 'high'
        ? [
            {
              position: [-1.4, -1.5, -2.0] as [number, number, number],
              scale: 0.62,
              detail,
              speed: 0.9,
              amplitude: 0.5,
              accent: highlight,
              highlight: accent,
              opacity: 0.38,
            },
          ]
        : []),
    ],
    [accent, highlight, detail, tier],
  );

  return (
    <>
      <AuroraField accent={accent} highlight={highlight} octaves={octaves} />
      <group position={[0, 0, 0]}>
        {shapes.map((shape, index) => (
          <FloatingShape key={index} {...shape} />
        ))}
      </group>
    </>
  );
}

/**
 * Hero background. Mounted client-side only (dynamic import at the call site)
 * and skipped entirely when the visitor asks for reduced motion.
 */
export default function HeroCanvas({
  accent = '#8B5CF6',
  highlight = '#22D3EE',
  className,
}: HeroCanvasProps) {
  const tier = usePerformanceTier();
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 70% 55% at 25% 15%, ${accent}30, transparent 62%),
                       radial-gradient(ellipse 60% 45% at 80% 30%, ${highlight}22, transparent 66%),
                       #050505`,
        }}
      />
    );
  }

  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, tier === 'high' ? 2 : 1.35]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ position: 'absolute', inset: 0 }}
        // Pause rendering when the tab is hidden — nothing animates off-screen.
        frameloop="always"
      >
        <Scene accent={accent} highlight={highlight} tier={tier} />
      </Canvas>
    </div>
  );
}
