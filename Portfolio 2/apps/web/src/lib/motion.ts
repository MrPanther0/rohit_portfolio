import type { Transition, Variants } from 'framer-motion';

/** Named easing curves — nothing here is linear. */
export const ease = {
  expo: [0.16, 1, 0.3, 1],
  power: [0.22, 1, 0.36, 1],
  smooth: [0.65, 0.05, 0, 1],
  soft: [0.4, 0, 0.2, 1],
  back: [0.34, 1.56, 0.64, 1],
} as const;

export const spring = {
  gentle: { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 },
  snappy: { type: 'spring', stiffness: 400, damping: 32, mass: 0.5 },
  magnetic: { type: 'spring', stiffness: 260, damping: 18, mass: 0.35 },
  cursor: { type: 'spring', stiffness: 700, damping: 42, mass: 0.28 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: ease.expo, delay: i * 0.06 },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: (i = 0) => ({ opacity: 1, transition: { duration: 1.1, ease: ease.soft, delay: i * 0.05 } }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.85, ease: ease.expo } },
};

/** Clip-path wipe used for image and panel reveals. */
export const clipReveal: Variants = {
  hidden: { clipPath: 'inset(0% 0% 100% 0%)' },
  show: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1.15, ease: ease.expo } },
};

export const stagger = (staggerChildren = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** Per-character mask reveal for display typography. */
export const charReveal: Variants = {
  hidden: { y: '110%', opacity: 0, rotateX: -45 },
  show: (i = 0) => ({
    y: '0%',
    opacity: 1,
    rotateX: 0,
    transition: { duration: 1.05, ease: ease.expo, delay: i * 0.022 },
  }),
};

export const wordReveal: Variants = {
  hidden: { y: '105%' },
  show: (i = 0) => ({ y: '0%', transition: { duration: 0.95, ease: ease.expo, delay: i * 0.05 } }),
};

export const viewportOnce = { once: true, amount: 0.25 } as const;
export const viewportSoft = { once: true, amount: 0.1 } as const;
