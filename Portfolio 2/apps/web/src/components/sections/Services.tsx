'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Aperture,
  Box,
  Compass,
  Grid3x3,
  Hexagon,
  Orbit,
  Package,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Service } from '@/lib/types';
import { withAlpha } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { useCursor } from '@/components/experience/CursorProvider';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

const ICONS: Record<string, LucideIcon> = {
  hexagon: Hexagon,
  aperture: Aperture,
  orbit: Orbit,
  grid: Grid3x3,
  package: Package,
  compass: Compass,
  box: Box,
  sparkles: Sparkles,
};

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 50 });

  const Icon = ICONS[service.icon] ?? Sparkles;
  const bind = cursor.bind('link', '', service.accent);

  return (
    <motion.div
      ref={cardRef}
      className="border-conic group relative overflow-hidden rounded-[26px] border border-white/8 bg-graphite-400/60 p-7 backdrop-blur-sm md:p-8"
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: ease.expo, delay: (index % 3) * 0.08 }}
      onPointerMove={(event) => {
        if (reduced) return;
        const bounds = cardRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const nx = (event.clientX - bounds.left) / bounds.width;
        const ny = (event.clientY - bounds.top) / bounds.height;
        setTilt({ x: (ny - 0.5) * -8, y: (nx - 0.5) * 8, gx: nx * 100, gy: ny * 100 });
      }}
      onPointerEnter={bind.onPointerEnter}
      onPointerLeave={() => {
        setTilt({ x: 0, y: 0, gx: 50, gy: 50 });
        bind.onPointerLeave();
      }}
      style={{
        transformStyle: 'preserve-3d',
        transform: reduced
          ? undefined
          : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 500ms cubic-bezier(0.16,1,0.3,1)',
        ['--angle' as string]: '120deg',
      }}
    >
      {/* Spotlight tracking the pointer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(340px circle at ${tilt.gx}% ${tilt.gy}%, ${withAlpha(service.accent, 0.16)}, transparent 65%)`,
        }}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl border transition-all duration-700 ease-expo group-hover:scale-110"
            style={{
              borderColor: withAlpha(service.accent, 0.28),
              background: withAlpha(service.accent, 0.09),
              color: service.accent,
            }}
          >
            <Icon size={20} strokeWidth={1.5} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/25">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3 className="mt-7 text-fluid-lg font-medium tracking-tight text-white">{service.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/50">{service.description}</p>

        <ul className="mt-6 space-y-2">
          {service.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-[13px] text-white/45">
              <span
                aria-hidden
                className="h-1 w-1 shrink-0 rounded-full"
                style={{ background: service.accent }}
              />
              {feature}
            </li>
          ))}
        </ul>

        {service.priceFrom ? (
          <p className="mt-7 border-t border-white/6 pt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
            {service.priceFrom}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

export function Services({ services }: { services: Service[] }) {
  if (!services.length) return null;

  return (
    <section id="services" className="relative bg-void py-24 md:py-32" aria-label="Services">
      <div className="container">
        <SectionHeading
          index="04"
          eyebrow="Services"
          title="What I actually do"
          description="Engagements are scoped from first principles. These are the shapes they usually take."
          className="max-w-3xl"
        />

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
