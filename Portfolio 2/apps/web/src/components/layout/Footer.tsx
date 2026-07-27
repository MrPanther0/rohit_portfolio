'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ease } from '@/lib/motion';
import type { SiteSettings } from '@/lib/types';
import { useCursor } from '@/components/experience/CursorProvider';
import { useSmoothScroll } from '@/components/experience/SmoothScroll';

export function Footer({ settings }: { settings: SiteSettings }) {
  const cursor = useCursor();
  const { scrollTo } = useSmoothScroll();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/6 bg-void pt-20">
      {/* Oversized wordmark bleeding off the baseline */}
      <motion.div
        className="pointer-events-none select-none px-4"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.3, ease: ease.expo }}
      >
        <span className="display block text-center text-fluid-mega leading-[0.78] text-white/[0.055]">
          {settings.ownerName}
        </span>
      </motion.div>

      <div className="container -mt-6 pb-10">
        <div className="grid gap-10 border-t border-white/6 pt-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="max-w-sm text-fluid-base leading-relaxed text-white/55">{settings.tagline}</p>
            <Link
              href={`mailto:${settings.email}`}
              className="group mt-6 inline-flex items-center gap-2 text-fluid-lg text-white transition-colors hover:text-signal"
              {...cursor.bind('link', 'write')}
            >
              {settings.email}
              <ArrowUpRight
                size={20}
                className="transition-transform duration-500 ease-expo group-hover:-translate-y-1 group-hover:translate-x-1"
              />
            </Link>
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow mb-4">Navigate</h2>
            <ul className="space-y-2.5">
              {[
                { label: 'Selected work', href: '#work' },
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Contact', href: '#contact' },
              ].map((item) => (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => scrollTo(item.href, -60)}
                    className="text-sm text-white/50 transition-colors hover:text-white"
                    {...cursor.bind('link')}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow mb-4">Elsewhere</h2>
            <ul className="space-y-2.5">
              {settings.socials.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
                    {...cursor.bind('link', 'open')}
                  >
                    {social.label}
                    <ArrowUpRight
                      size={14}
                      className="opacity-0 transition-all duration-400 group-hover:opacity-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/6 pt-6 md:flex-row md:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
            © {year} {settings.ownerName} · {settings.location}
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/admin"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 transition-colors hover:text-white/70"
              {...cursor.bind('link')}
            >
              Studio access
            </Link>
            <button
              type="button"
              onClick={() => scrollTo(0)}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30 transition-colors hover:text-white/70"
              {...cursor.bind('link', 'top')}
            >
              Back to top ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
