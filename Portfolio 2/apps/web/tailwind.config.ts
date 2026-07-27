import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '2rem', lg: '3rem', '2xl': '4rem' },
      screens: { '2xl': '1600px' },
    },
    extend: {
      colors: {
        void: '#050505',
        obsidian: '#0A0A0D',
        graphite: {
          DEFAULT: '#141419',
          50: '#1C1C22',
          100: '#17171C',
          200: '#141419',
          300: '#101014',
          400: '#0C0C10',
        },
        bone: '#F4F2ED',
        ultraviolet: {
          DEFAULT: '#8B5CF6',
          soft: '#A78BFA',
          deep: '#6D28D9',
        },
        signal: {
          DEFAULT: '#22D3EE',
          soft: '#67E8F9',
          deep: '#0891B2',
        },
        ember: '#F472B6',
        // Semantic tokens consumed by the admin surface.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'fluid-xs': 'clamp(0.7rem, 0.66rem + 0.2vw, 0.8rem)',
        'fluid-sm': 'clamp(0.85rem, 0.8rem + 0.25vw, 0.95rem)',
        'fluid-base': 'clamp(1rem, 0.95rem + 0.3vw, 1.15rem)',
        'fluid-lg': 'clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)',
        'fluid-xl': 'clamp(1.75rem, 1.4rem + 1.6vw, 3rem)',
        'fluid-2xl': 'clamp(2.5rem, 1.8rem + 3.2vw, 5rem)',
        'fluid-3xl': 'clamp(3.5rem, 2rem + 7vw, 9rem)',
        'fluid-mega': 'clamp(4rem, 1rem + 14vw, 18rem)',
      },
      letterSpacing: {
        tightest: '-0.06em',
        mega: '-0.055em',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(139,92,246,0.22), transparent 60%), radial-gradient(ellipse 70% 50% at 85% 20%, rgba(34,211,238,0.16), transparent 65%)',
        'glass':
          'linear-gradient(140deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.045) 100%)',
        'sheen':
          'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 48%, transparent 60%)',
      },
      boxShadow: {
        elevated: '0 30px 80px -40px rgba(0,0,0,0.9), 0 2px 10px -4px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(139,92,246,0.18), 0 20px 60px -30px rgba(139,92,246,0.55)',
        'glow-signal': '0 0 0 1px rgba(34,211,238,0.2), 0 20px 60px -30px rgba(34,211,238,0.5)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      // Named steps for the slower, cinematic transitions used across the site.
      transitionDuration: {
        400: '400ms',
        600: '600ms',
        900: '900ms',
        1200: '1200ms',
        1400: '1400ms',
        1600: '1600ms',
      },
      transitionTimingFunction: {
        // Premium easing — nothing linear.
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
        power: 'cubic-bezier(0.22, 1, 0.36, 1)',
        smooth: 'cubic-bezier(0.65, 0.05, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'marquee-x': {
          from: { transform: 'translate3d(0,0,0)' },
          to: { transform: 'translate3d(-50%,0,0)' },
        },
        'drift': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-14px,0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '80%,100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'sheen-sweep': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0,18px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
      },
      animation: {
        marquee: 'marquee-x 40s linear infinite',
        drift: 'drift 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.16,1,0.3,1) infinite',
        sheen: 'sheen-sweep 6s linear infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [animate],
};

export default config;
