'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { useCursor } from '@/components/experience/CursorProvider';
import { useSmoothScroll } from '@/components/experience/SmoothScroll';
import { MagneticButton } from '@/components/ui/MagneticButton';

const LINKS = [
  { label: 'Work', href: '/#work', index: '01' },
  { label: 'About', href: '/#about', index: '02' },
  { label: 'Skills', href: '/#skills', index: '03' },
  { label: 'Services', href: '/#services', index: '04' },
  { label: 'Recognition', href: '/#awards', index: '05' },
  { label: 'Contact', href: '/#contact', index: '06' },
];

export function Header({ name, availability }: { name: string; availability: string }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState('');

  const { scrollY } = useScroll();
  const cursor = useCursor();
  const { scrollTo } = useSmoothScroll();
  const pathname = usePathname();

  useMotionValueEvent(scrollY, 'change', (value) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(value > 40);
    setHidden(value > previous && value > 220 && !menuOpen);
  });

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navigate = (href: string) => (event: React.MouseEvent) => {
    if (!href.startsWith('/#')) return;
    if (pathname !== '/') return; // let Next handle the cross-page jump
    event.preventDefault();
    setMenuOpen(false);
    window.setTimeout(() => scrollTo(href.slice(1), -80), menuOpen ? 620 : 0);
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[100] no-print"
        initial={{ y: -120 }}
        animate={{ y: hidden ? -120 : 0 }}
        transition={{ duration: 0.7, ease: ease.expo }}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-4 px-5 py-4 transition-all duration-700 ease-expo md:px-10',
            scrolled && 'backdrop-blur-xl',
          )}
        >
          <Link
            href="/"
            className="group flex items-baseline gap-2"
            aria-label={`${name} — home`}
            {...cursor.bind('link')}
          >
            <span className="display text-xl leading-none text-white transition-colors duration-500 group-hover:text-ultraviolet-soft md:text-2xl">
              {name}
            </span>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-signal md:block" />
          </Link>

          <nav className="hidden lg:block" aria-label="Primary">
            <ul
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-700 ease-expo',
                scrolled ? 'glass-soft' : 'bg-transparent',
              )}
            >
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={navigate(link.href)}
                    className="group relative block rounded-full px-4 py-2 text-sm text-white/60 transition-colors duration-400 hover:text-white"
                    {...cursor.bind('link')}
                  >
                    <span className="relative z-10">{link.label}</span>
                    <span className="absolute inset-0 scale-75 rounded-full bg-white/[0.06] opacity-0 transition-all duration-500 ease-expo group-hover:scale-100 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40 xl:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {availability}
              {clock ? <span className="text-white/25">· {clock}</span> : null}
            </span>

            <MagneticButton
              href="/#contact"
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => {
                if (pathname === '/') scrollTo('#contact', -60);
              }}
            >
              Start a project
            </MagneticButton>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-white/12 lg:hidden"
              {...cursor.bind('link')}
            >
              <span className="sr-only">Menu</span>
              <motion.span
                className="absolute h-px w-4 bg-white"
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 0 : -3 }}
                transition={{ duration: 0.45, ease: ease.expo }}
              />
              <motion.span
                className="absolute h-px w-4 bg-white"
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? 0 : 3 }}
                transition={{ duration: 0.45, ease: ease.expo }}
              />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-[95] flex flex-col justify-center bg-void/97 px-6 backdrop-blur-2xl lg:hidden"
            initial={{ clipPath: 'circle(0% at 92% 5%)' }}
            animate={{ clipPath: 'circle(150% at 92% 5%)' }}
            exit={{ clipPath: 'circle(0% at 92% 5%)' }}
            transition={{ duration: 0.8, ease: ease.expo }}
          >
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {LINKS.map((link, index) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.65, ease: ease.expo, delay: 0.12 + index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={navigate(link.href)}
                      className="flex items-baseline gap-4 border-b border-white/6 py-4"
                    >
                      <span className="font-mono text-[10px] text-ultraviolet">{link.index}</span>
                      <span className="display text-[13vw] leading-none text-white">{link.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>

            <motion.p
              className="mt-10 font-mono text-[10px] uppercase tracking-[0.24em] text-white/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {availability}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
