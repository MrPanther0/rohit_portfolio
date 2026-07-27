'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SkillNode } from '@/lib/types';
import { usePerformanceTier, usePrefersReducedMotion } from '@/hooks/useEnvironment';

const GROUP_COLOURS: Record<string, string> = {
  Design: '#8B5CF6',
  Motion: '#FACC15',
  Tools: '#22D3EE',
  Strategy: '#34D399',
};

function colourFor(group: string): string {
  return GROUP_COLOURS[group] ?? '#A78BFA';
}

interface PositionedSkill extends SkillNode {
  position: THREE.Vector3;
  colour: string;
}

/** Fibonacci sphere — even angular distribution with no clustering at the poles. */
function distribute(skills: SkillNode[], radius: number): PositionedSkill[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return skills.map((skill, index) => {
    const y = 1 - (index / Math.max(skills.length - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    // Stronger skills sit slightly further out — proficiency reads as presence.
    const r = radius * (0.78 + (skill.level / 100) * 0.28);
    return {
      ...skill,
      colour: colourFor(skill.group),
      position: new THREE.Vector3(Math.cos(theta) * ring * r, y * r, Math.sin(theta) * ring * r),
    };
  });
}

function Constellation({
  skills,
  onHover,
  registerProjector,
}: {
  skills: PositionedSkill[];
  onHover: (index: number | null) => void;
  registerProjector: (fn: (index: number) => { x: number; y: number } | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const hovered = useRef<number | null>(null);

  // Connect nodes that share a discipline and sit close together.
  const edges = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < skills.length; i += 1) {
      for (let j = i + 1; j < skills.length; j += 1) {
        const a = skills[i]!;
        const b = skills[j]!;
        if (a.group !== b.group) continue;
        if (a.position.distanceTo(b.position) > 2.6) continue;
        points.push(a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z);
      }
    }
    return new Float32Array(points);
  }, [skills]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(edges, 3));
    return g;
  }, [edges]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Idle orbit, nudged by the pointer.
    group.rotation.y += delta * 0.12;
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, state.pointer.y * 0.35, 2, delta);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, state.pointer.x * -0.12, 2, delta);
  });

  // Exposes world→screen projection so the DOM label can follow a node.
  useEffect(() => {
    registerProjector((index) => {
      const group = groupRef.current;
      const skill = skills[index];
      if (!group || !skill) return null;
      const world = skill.position.clone().applyMatrix4(group.matrixWorld).project(camera);
      return {
        x: (world.x * 0.5 + 0.5) * size.width,
        y: (-world.y * 0.5 + 0.5) * size.height,
      };
    });
  }, [registerProjector, skills, camera, size.width, size.height]);

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.09} />
      </lineSegments>

      {skills.map((skill, index) => (
        <mesh
          key={skill.name}
          position={skill.position}
          scale={0.055 + (skill.level / 100) * 0.075}
          onPointerOver={(event) => {
            event.stopPropagation();
            hovered.current = index;
            onHover(index);
            document.body.style.cursor = 'none';
          }}
          onPointerOut={() => {
            if (hovered.current === index) {
              hovered.current = null;
              onHover(null);
            }
          }}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={skill.colour} transparent opacity={0.92} />
        </mesh>
      ))}

      {/* Soft halo pass — additive spheres give the nodes a bloom without post-processing. */}
      {skills.map((skill) => (
        <mesh key={`${skill.name}-halo`} position={skill.position} scale={0.16 + (skill.level / 100) * 0.2}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            color={skill.colour}
            transparent
            opacity={0.11}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SkillsConstellation({ skills }: { skills: SkillNode[] }) {
  const reduced = usePrefersReducedMotion();
  const tier = usePerformanceTier();
  const [hovered, setHovered] = useState<number | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const projectorRef = useRef<((index: number) => { x: number; y: number } | null) | null>(null);
  const frameRef = useRef<number>(0);

  const positioned = useMemo(() => distribute(skills, 2.5), [skills]);

  // Keep the DOM label pinned to its node without re-rendering React each frame.
  const followNode = useCallback((index: number | null) => {
    cancelAnimationFrame(frameRef.current);
    if (index === null) return;

    const step = () => {
      const point = projectorRef.current?.(index);
      const label = labelRef.current;
      if (point && label) {
        label.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -140%)`;
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, []);

  const handleHover = useCallback(
    (index: number | null) => {
      setHovered(index);
      followNode(index);
    },
    [followNode],
  );

  const handleProjector = useCallback((fn: (index: number) => { x: number; y: number } | null) => {
    projectorRef.current = fn;
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const active = hovered !== null ? positioned[hovered] : null;

  if (reduced) {
    return (
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {positioned.map((skill) => (
          <li key={skill.name} className="glass-soft rounded-2xl px-4 py-3">
            <span className="block text-sm font-medium text-white/90">{skill.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: skill.colour }}>
              {skill.group} · {skill.level}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-[640px]">
      <Canvas
        dpr={[1, tier === 'high' ? 2 : 1.35]}
        camera={{ position: [0, 0, 7], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Constellation skills={positioned} onHover={handleHover} registerProjector={handleProjector} />
      </Canvas>

      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 will-change-transform"
        style={{ opacity: active ? 1 : 0, transition: 'opacity 220ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        {active ? (
          <div
            className="glass rounded-full px-4 py-2 text-center"
            style={{ boxShadow: `0 0 40px -12px ${active.colour}` }}
          >
            <span className="block whitespace-nowrap text-sm font-medium text-white">{active.name}</span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: active.colour }}
            >
              {active.group}
            </span>
          </div>
        ) : null}
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-0 left-0 flex flex-wrap gap-x-5 gap-y-2">
        {Object.entries(GROUP_COLOURS).map(([group, colour]) => (
          <span key={group} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: colour }} />
            {group}
          </span>
        ))}
      </div>
    </div>
  );
}
