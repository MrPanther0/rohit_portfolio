'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ClientLogo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Marquee } from '@/components/ui/Marquee';
import { useCursor } from '@/components/experience/CursorProvider';

function Wordmark({ client, onHover }: { client: ClientLogo; onHover: (name: string | null) => void }) {
  const cursor = useCursor();
  const Wrapper = client.url ? 'a' : 'div';
  const bind = cursor.bind('link', 'visit');

  return (
    <Wrapper
      {...(client.url ? { href: client.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group relative flex shrink-0 items-center px-8 md:px-12"
      onPointerEnter={() => {
        onHover(client.name);
        if (client.url) bind.onPointerEnter();
      }}
      onPointerLeave={() => {
        onHover(null);
        if (client.url) bind.onPointerLeave();
      }}
    >
      {client.logo?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={client.logo.thumbnailUrl ?? client.logo.url}
          alt={client.name}
          className="h-8 w-auto opacity-40 grayscale transition-all duration-700 ease-expo group-hover:opacity-100 group-hover:grayscale-0 md:h-10"
          loading="lazy"
        />
      ) : (
        <span className="display whitespace-nowrap text-[clamp(1.5rem,3vw,2.4rem)] text-white/25 transition-colors duration-700 ease-expo group-hover:text-white">
          {client.wordmark ?? client.name}
        </span>
      )}
    </Wrapper>
  );
}

export function Clients({ clients }: { clients: ClientLogo[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!clients.length) return null;

  return (
    <section className="relative border-y border-white/6 bg-void py-16" aria-label="Clients">
      <div className="container mb-10 flex items-baseline justify-between gap-6">
        <h2 className="eyebrow">Trusted by</h2>
        <motion.p
          key={hovered ?? 'idle'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.24em]',
            hovered ? 'text-signal' : 'text-white/25',
          )}
        >
          {hovered ?? `${clients.length} studios & brands`}
        </motion.p>
      </div>

      <div className="mask-fade-x">
        <Marquee speed={44} scrollBoost={0.5} pauseOnHover>
          {clients.map((client) => (
            <Wordmark key={client.id} client={client} onHover={setHovered} />
          ))}
        </Marquee>

        <Marquee speed={-32} scrollBoost={-0.4} className="mt-6 opacity-60" pauseOnHover>
          {[...clients].reverse().map((client) => (
            <Wordmark key={`${client.id}-b`} client={client} onHover={setHovered} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
