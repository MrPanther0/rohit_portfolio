'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SkillNode } from '@/lib/types';
import { ease } from '@/lib/motion';
import { SectionHeading } from '@/components/layout/SectionHeading';

const SkillsConstellation = dynamic(() => import('@/components/canvas/SkillsConstellation'), {
  ssr: false,
  loading: () => <div className="aspect-square w-full max-w-[640px] animate-pulse rounded-full bg-white/[0.02]" />,
});

export function Skills({ skills }: { skills: SkillNode[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, SkillNode[]>();
    for (const skill of skills) {
      const bucket = map.get(skill.group) ?? [];
      bucket.push(skill);
      map.set(skill.group, bucket);
    }
    return [...map.entries()].map(([name, items]) => ({
      name,
      items: items.sort((a, b) => b.level - a.level),
    }));
  }, [skills]);

  if (!skills.length) return null;

  return (
    <section id="skills" className="relative overflow-hidden bg-void py-24 md:py-32" aria-label="Skills">
      {/* Ambient wash behind the constellation */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(34,211,238,0.06) 45%, transparent 70%)',
        }}
      />

      <div className="container relative">
        <SectionHeading
          index="03"
          eyebrow="Capabilities"
          title="A constellation, not a checklist"
          description="Disciplines cluster by how they are actually used together. Hover a node to name it."
          className="max-w-3xl"
        />

        <div className="mt-16 grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="flex justify-center">
            <SkillsConstellation skills={skills} />
          </div>

          <div className="space-y-10">
            {groups.map((group, groupIndex) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.85, ease: ease.expo, delay: groupIndex * 0.08 }}
              >
                <h3 className="eyebrow mb-4">{group.name}</h3>
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <li
                      key={skill.name}
                      className="group relative overflow-hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/65 transition-colors duration-500 hover:border-white/25 hover:text-white"
                    >
                      {/* Proficiency reads as a fill that sweeps in on hover. */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 -translate-x-full bg-white/[0.07] transition-transform duration-900 ease-expo group-hover:translate-x-0"
                        style={{ width: `${skill.level}%` }}
                      />
                      <span className="relative">{skill.name}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
