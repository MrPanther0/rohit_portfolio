/**
 * Seeds a fully populated portfolio: an administrator, site settings, taxonomy,
 * six case studies and their supporting artwork.
 *
 * Cover art is generated at seed time with sharp (deterministic gradient
 * compositions) so the install works offline and ships no binary fixtures.
 */
import sharp from 'sharp';
import { PrismaClient, type MediaKind } from '@prisma/client';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/lib/tokens.js';
import { storage } from '../src/lib/storage.js';

const prisma = new PrismaClient();

// ── Deterministic artwork generation ─────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PosterOptions {
  width: number;
  height: number;
  accent: string;
  secondary: string;
  seed: number;
  label?: string;
  variant?: 'orbit' | 'strata' | 'grid' | 'bloom';
}

function posterSvg({
  width,
  height,
  accent,
  secondary,
  seed,
  label = '',
  variant = 'orbit',
}: PosterOptions): string {
  const rand = mulberry32(seed);
  const shapes: string[] = [];

  if (variant === 'orbit') {
    for (let i = 0; i < 7; i += 1) {
      const r = (0.18 + rand() * 0.42) * Math.min(width, height);
      shapes.push(
        `<circle cx="${(0.15 + rand() * 0.7) * width}" cy="${(0.15 + rand() * 0.7) * height}" r="${r.toFixed(1)}" fill="none" stroke="url(#stroke)" stroke-width="${(0.6 + rand() * 2).toFixed(2)}" opacity="${(0.12 + rand() * 0.3).toFixed(2)}"/>`,
      );
    }
  } else if (variant === 'strata') {
    for (let i = 0; i < 14; i += 1) {
      const y = (i / 14) * height + rand() * 18;
      shapes.push(
        `<rect x="${(-0.1 + rand() * 0.2) * width}" y="${y.toFixed(1)}" width="${width * 1.2}" height="${(2 + rand() * 26).toFixed(1)}" fill="url(#stroke)" opacity="${(0.05 + rand() * 0.18).toFixed(2)}" transform="rotate(${(-8 + rand() * 16).toFixed(2)} ${width / 2} ${height / 2})"/>`,
      );
    }
  } else if (variant === 'grid') {
    const cols = 9;
    const rows = 7;
    for (let x = 0; x < cols; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        if (rand() > 0.62) continue;
        const cell = width / cols;
        shapes.push(
          `<rect x="${(x * cell).toFixed(1)}" y="${(y * (height / rows)).toFixed(1)}" width="${(cell * (0.3 + rand() * 0.6)).toFixed(1)}" height="${((height / rows) * (0.2 + rand() * 0.5)).toFixed(1)}" fill="url(#stroke)" opacity="${(0.06 + rand() * 0.24).toFixed(2)}" rx="4"/>`,
        );
      }
    }
  } else {
    for (let i = 0; i < 5; i += 1) {
      shapes.push(
        `<ellipse cx="${(rand() * width).toFixed(1)}" cy="${(rand() * height).toFixed(1)}" rx="${(width * (0.2 + rand() * 0.35)).toFixed(1)}" ry="${(height * (0.15 + rand() * 0.3)).toFixed(1)}" fill="url(#bloom)" opacity="${(0.25 + rand() * 0.35).toFixed(2)}"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08080c"/>
      <stop offset="55%" stop-color="#0d0b16"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow" cx="30%" cy="20%" r="70%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soften"><feGaussianBlur stdDeviation="${(Math.min(width, height) * 0.012).toFixed(1)}"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <g filter="url(#soften)">${shapes.join('')}</g>
  ${
    label
      ? `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.075)}"
        font-weight="700" letter-spacing="${Math.round(Math.min(width, height) * 0.012)}"
        fill="#ffffff" opacity="0.9">${label}</text>`
      : ''
  }
</svg>`;
}

async function createArtwork(options: PosterOptions): Promise<Buffer> {
  return sharp(Buffer.from(posterSvg(options))).webp({ quality: 88 }).toBuffer();
}

async function storeArtwork(name: string, options: PosterOptions, folder = 'seed') {
  const buffer = await createArtwork(options);
  const stored = await storage.save({
    buffer,
    filename: `${name}.webp`,
    mimeType: 'image/webp',
    folder,
  });

  return prisma.media.create({
    data: {
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl,
      storageKey: stored.storageKey,
      driver: stored.driver,
      filename: `${name}.webp`,
      mimeType: 'image/webp',
      kind: 'IMAGE' as MediaKind,
      size: buffer.byteLength,
      width: stored.width ?? options.width,
      height: stored.height ?? options.height,
      blurDataUrl: stored.blurDataUrl,
      alt: name.replace(/-/g, ' '),
    },
  });
}

// ── Content definitions ──────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Brand Identity', color: '#8B5CF6', description: 'Systems, marks and the rules that hold them together.' },
  { name: 'Editorial', color: '#22D3EE', description: 'Typography-led layouts for print and screen.' },
  { name: 'Packaging', color: '#F472B6', description: 'Structure, surface and shelf presence.' },
  { name: 'Motion', color: '#FACC15', description: 'Design that moves — titles, loops and transitions.' },
  { name: 'Digital Product', color: '#34D399', description: 'Interfaces with a point of view.' },
];

const TAGS = [
  'Art Direction',
  'Typography',
  'Visual Identity',
  '3D',
  'Print',
  'Campaign',
  'Illustration',
  'Motion Design',
  'Packaging',
  'Design System',
];

interface SeedProject {
  title: string;
  subtitle: string;
  excerpt: string;
  description: string;
  category: string;
  tags: string[];
  client: string;
  role: string;
  year: number;
  duration: string;
  accent: string;
  secondary: string;
  featured: boolean;
  variant: PosterOptions['variant'];
  deliverables: string[];
  palette: { name: string; hex: string; usage: string }[];
  typography: { family: string; role: string; weights: string; sample: string }[];
  processSteps: { title: string; body: string; duration: string }[];
  metrics: { label: string; value: string }[];
  feedback: { quote: string; author: string; role: string };
}

const PROJECTS: SeedProject[] = [
  {
    title: 'Nocturne',
    subtitle: 'An identity for a late-night listening room',
    excerpt:
      'A brand built for low light — a mark that resolves at a glance and a type system that behaves like sound.',
    description: `Nocturne is a listening room that opens when the rest of the city closes. The identity had to work in almost no light, on surfaces from vinyl sleeves to a projected wall, and read instantly from across a dark room.

The mark is a crescent cut from a circle — a moon, a speaker cone, a groove in a record, depending on where you meet it. Everything else in the system is deliberately quiet so the mark can carry the weight.

We drew a variable display face whose weight axis maps to volume: quiet copy sits at 200, a headline at 800. Applied across the space, the identity behaves less like a logo and more like a lighting rig.`,
    category: 'Brand Identity',
    tags: ['Visual Identity', 'Typography', 'Art Direction'],
    client: 'Nocturne Listening Room',
    role: 'Identity design, art direction, type design',
    year: 2024,
    duration: '14 weeks',
    accent: '#8B5CF6',
    secondary: '#22D3EE',
    featured: true,
    variant: 'orbit',
    deliverables: ['Logotype & marks', 'Variable display typeface', 'Signage system', 'Brand book (96pp)'],
    palette: [
      { name: 'Void', hex: '#050505', usage: 'Primary surface' },
      { name: 'Graphite', hex: '#141419', usage: 'Cards, elevated surfaces' },
      { name: 'Ultraviolet', hex: '#8B5CF6', usage: 'Primary accent' },
      { name: 'Signal', hex: '#22D3EE', usage: 'Highlights and wayfinding' },
      { name: 'Bone', hex: '#F5F3EF', usage: 'Typography' },
    ],
    typography: [
      { family: 'Nocturne Display', role: 'Headlines', weights: '200 – 800 variable', sample: 'After Hours' },
      { family: 'Söhne', role: 'Body & interface', weights: '400 / 500', sample: 'Doors at 22:00' },
    ],
    processSteps: [
      {
        title: 'Listening',
        body: 'Two weeks on site with the founders, sound engineers and regulars. Every design decision traces back to something observed in the room rather than a mood board.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Marks',
        body: 'Forty crescent studies narrowed to three, each stress-tested at 12px on a ticket stub and at four metres on the façade.',
        duration: 'Weeks 3–6',
      },
      {
        title: 'Type',
        body: 'A variable display face drawn from scratch, with the weight axis tuned so that headline settings still hold at low ambient light.',
        duration: 'Weeks 7–11',
      },
      {
        title: 'System',
        body: 'Signage, print, ticketing and a motion kit for the projection wall, delivered as a 96-page book plus a Figma library.',
        duration: 'Weeks 12–14',
      },
    ],
    metrics: [
      { label: 'Ticket sales, first quarter', value: '+41%' },
      { label: 'Applications designed', value: '68' },
      { label: 'Type weights shipped', value: '9' },
    ],
    feedback: {
      quote:
        'We asked for a logo and got a way of seeing the room. Regulars started describing the space using the language from the brand book.',
      author: 'Ilse Brandt',
      role: 'Founder, Nocturne',
    },
  },
  {
    title: 'Meridian Press',
    subtitle: 'A quarterly that argues with itself',
    excerpt:
      'Editorial design for a journal where two writers take opposing positions — the layout takes a side on every spread.',
    description: `Meridian publishes paired essays: two writers, one question, opposing answers. The design brief was to make disagreement legible without turning it into a gimmick.

Each spread is split on an optical axis rather than a mathematical one, so the "stronger" argument physically occupies more of the page. Readers notice the imbalance before they finish the first paragraph.

The grid is a twelve-column asymmetric system with a floating baseline; footnotes migrate across the gutter and occasionally interrupt the opposing essay. Printing is two-colour throughout — the second colour changes every issue.`,
    category: 'Editorial',
    tags: ['Typography', 'Print', 'Art Direction'],
    client: 'Meridian Press',
    role: 'Editorial design, art direction',
    year: 2024,
    duration: '9 weeks + ongoing',
    accent: '#22D3EE',
    secondary: '#8B5CF6',
    featured: true,
    variant: 'strata',
    deliverables: ['Grid system', 'Four issues art directed', 'Cover series', 'Production specification'],
    palette: [
      { name: 'Newsprint', hex: '#EDE9E1', usage: 'Stock' },
      { name: 'Ink', hex: '#0A0A0A', usage: 'Text' },
      { name: 'Cyan Signal', hex: '#22D3EE', usage: 'Second colour, issue 01' },
      { name: 'Violet Signal', hex: '#8B5CF6', usage: 'Second colour, issue 02' },
    ],
    typography: [
      { family: 'Lyon Text', role: 'Long-form body', weights: '400 / 400 italic', sample: 'On the other hand,' },
      { family: 'Union Grotesk', role: 'Decks & furniture', weights: '500 / 700', sample: 'COUNTERPOINT' },
    ],
    processSteps: [
      {
        title: 'Reading',
        body: 'Every essay in the launch issue read twice before a single grid line was drawn. The structure came out of the arguments, not the other way round.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Grid',
        body: 'An asymmetric twelve-column system with an optical centre line that shifts by up to 40mm depending on the weight of each argument.',
        duration: 'Weeks 3–5',
      },
      {
        title: 'Press',
        body: 'Four paper stocks and six ink pairings tested on press before settling on an uncoated 90gsm with a fluorescent second hit.',
        duration: 'Weeks 6–7',
      },
      {
        title: 'Handover',
        body: 'A production specification detailed enough that the in-house team ships issues without design supervision.',
        duration: 'Weeks 8–9',
      },
    ],
    metrics: [
      { label: 'Subscriber growth', value: '3.2×' },
      { label: 'Issues shipped', value: '4' },
      { label: 'Press awards', value: '2' },
    ],
    feedback: {
      quote:
        'The layout does half the editing for us now. When an essay does not earn its space, the grid makes that painfully obvious.',
      author: 'Devan Ross',
      role: 'Editor-in-chief, Meridian Press',
    },
  },
  {
    title: 'Halo Botanics',
    subtitle: 'Packaging that reads in one second',
    excerpt:
      'A twenty-four SKU skincare range organised by a single continuous gradient, so the shelf explains itself.',
    description: `Twenty-four products, six concerns, three strengths — and a shelf where customers were spending ninety seconds trying to work out which bottle they needed.

The system replaces category names with position on a single continuous gradient that runs the length of the shelf. Strength reads vertically as a rising bar; concern reads horizontally as hue. A customer who has never seen the brand can find the right bottle without reading a word.

Every component is mono-material and the ink coverage was reduced by 38% without losing shelf impact — the gradient does more work than a full-bleed print would.`,
    category: 'Packaging',
    tags: ['Packaging', 'Design System', 'Illustration'],
    client: 'Halo Botanics',
    role: 'Packaging design, system design',
    year: 2023,
    duration: '18 weeks',
    accent: '#F472B6',
    secondary: '#FACC15',
    featured: true,
    variant: 'bloom',
    deliverables: ['24 SKU artwork', 'Structural design', 'Shelf system', 'Artwork automation templates'],
    palette: [
      { name: 'Dawn', hex: '#FACC15', usage: 'Gradient origin — barrier' },
      { name: 'Bloom', hex: '#F472B6', usage: 'Gradient midpoint — repair' },
      { name: 'Dusk', hex: '#8B5CF6', usage: 'Gradient terminus — renewal' },
      { name: 'Clay', hex: '#1C1917', usage: 'Type and structure' },
    ],
    typography: [
      { family: 'GT Alpina', role: 'Product names', weights: '300 / 500', sample: 'Barrier Serum' },
      { family: 'Diatype Mono', role: 'Ingredients & dosage', weights: '400', sample: '12% NIACINAMIDE' },
    ],
    processSteps: [
      {
        title: 'Shelf audit',
        body: 'Forty hours of filmed shelf observation across six stores, timing how long shoppers took to select a product.',
        duration: 'Weeks 1–3',
      },
      {
        title: 'Colour engineering',
        body: 'A perceptually uniform gradient built in OKLCH so that adjacent SKUs remain distinguishable under retail lighting.',
        duration: 'Weeks 4–8',
      },
      {
        title: 'Structure',
        body: 'Mono-material bottles and cartons designed for kerbside recycling, prototyped in five rounds.',
        duration: 'Weeks 9–14',
      },
      {
        title: 'Automation',
        body: 'Parametric artwork templates so new SKUs generate correct colour, position and copy without a designer.',
        duration: 'Weeks 15–18',
      },
    ],
    metrics: [
      { label: 'Time to select, in store', value: '−62%' },
      { label: 'Ink coverage', value: '−38%' },
      { label: 'SKUs systematised', value: '24' },
    ],
    feedback: {
      quote:
        'Retail buyers now use our shelf as the example when they brief other brands. That has never happened to us before.',
      author: 'Priya Anand',
      role: 'Brand Director, Halo Botanics',
    },
  },
  {
    title: 'Vector Field',
    subtitle: 'Title sequence for a documentary on weather',
    excerpt: 'Ninety seconds of procedural motion where every particle is driven by real recorded wind data.',
    description: `The opening titles for a feature documentary about people who chase storms. The director's only instruction: "it should feel like standing in it."

Rather than animate by hand, the sequence is driven by four days of anemometer data from a research station. Each particle samples the real vector field; the typography is displaced by the same forces. When the wind drops on day three, the titles go still — that pause is in the data, not the keyframes.

Rendered in Houdini, graded to match the film's stock, and delivered as both a 90-second sequence and a modular kit for lower thirds.`,
    category: 'Motion',
    tags: ['Motion Design', '3D', 'Art Direction'],
    client: 'Fieldwork Films',
    role: 'Design & direction, procedural animation',
    year: 2024,
    duration: '11 weeks',
    accent: '#FACC15',
    secondary: '#22D3EE',
    featured: false,
    variant: 'grid',
    deliverables: ['90s title sequence', 'Lower-third kit', 'Poster series', 'Data visualisation stills'],
    palette: [
      { name: 'Storm', hex: '#0B1220', usage: 'Base' },
      { name: 'Static', hex: '#FACC15', usage: 'Particle high energy' },
      { name: 'Front', hex: '#22D3EE', usage: 'Particle low energy' },
      { name: 'Rain', hex: '#94A3B8', usage: 'Secondary type' },
    ],
    typography: [
      { family: 'Söhne Breit', role: 'Title cards', weights: '700', sample: 'VECTOR FIELD' },
      { family: 'Söhne Mono', role: 'Data annotations', weights: '400', sample: '54.2°N  17.4 m/s' },
    ],
    processSteps: [
      {
        title: 'Data',
        body: 'Four days of anemometer readings cleaned, resampled and converted into a volumetric vector field.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Look development',
        body: 'Eleven particle systems tested against the film grade until one held legibility at both cinema and phone scale.',
        duration: 'Weeks 3–6',
      },
      {
        title: 'Type in motion',
        body: 'Letterforms rebuilt as deformable meshes so the same forces that move the particles displace the typography.',
        duration: 'Weeks 7–9',
      },
      {
        title: 'Delivery',
        body: 'Final renders at 4K DCI plus a modular lower-third kit the edit team drives themselves.',
        duration: 'Weeks 10–11',
      },
    ],
    metrics: [
      { label: 'Frames rendered', value: '2,160' },
      { label: 'Particles per frame', value: '1.4M' },
      { label: 'Festival selections', value: '7' },
    ],
    feedback: {
      quote:
        'Three separate people asked me which storm we filmed for the titles. There is no footage in it at all.',
      author: 'Marta Kalu',
      role: 'Director, Vector Field',
    },
  },
  {
    title: 'Kiln',
    subtitle: 'A design system for a ceramics marketplace',
    excerpt:
      'An interface where the product photography sets the palette — every page inherits colour from the object being sold.',
    description: `Kiln sells one-off ceramics from four hundred independent studios. No two products look alike, which broke every conventional marketplace layout we tested.

The system extracts a palette from each product photograph at upload and uses it to tint the surrounding interface — surfaces, focus rings, even the checkout. The chrome recedes and the object leads.

Accessibility was the hard constraint: extracted colours are pushed through a contrast solver that guarantees WCAG AA against every text layer before they are ever painted.`,
    category: 'Digital Product',
    tags: ['Design System', 'Art Direction', 'Typography'],
    client: 'Kiln Marketplace',
    role: 'Design system, art direction',
    year: 2023,
    duration: '20 weeks',
    accent: '#34D399',
    secondary: '#8B5CF6',
    featured: false,
    variant: 'orbit',
    deliverables: ['Component library (142)', 'Colour extraction spec', 'Motion guidelines', 'Documentation site'],
    palette: [
      { name: 'Slip', hex: '#F7F5F2', usage: 'Light surface' },
      { name: 'Reduction', hex: '#111110', usage: 'Dark surface' },
      { name: 'Celadon', hex: '#34D399', usage: 'System accent fallback' },
      { name: 'Cobalt', hex: '#8B5CF6', usage: 'Interactive states' },
    ],
    typography: [
      { family: 'Reckless Neue', role: 'Product titles', weights: '300 / 400', sample: 'Ash-glazed vessel' },
      { family: 'Inter', role: 'Interface', weights: '400 / 500 / 600', sample: 'Add to basket' },
    ],
    processSteps: [
      {
        title: 'Audit',
        body: 'Twelve thousand product photographs analysed for hue distribution, background consistency and contrast range.',
        duration: 'Weeks 1–4',
      },
      {
        title: 'Colour engine',
        body: 'A k-means extractor paired with an OKLCH contrast solver so every derived colour is legally legible before it ships.',
        duration: 'Weeks 5–11',
      },
      {
        title: 'Components',
        body: '142 components built against the dynamic palette, each tested at four extracted-colour extremes.',
        duration: 'Weeks 12–17',
      },
      {
        title: 'Documentation',
        body: 'A living documentation site with copy-paste tokens and a colour sandbox for the engineering team.',
        duration: 'Weeks 18–20',
      },
    ],
    metrics: [
      { label: 'Components shipped', value: '142' },
      { label: 'Add-to-basket rate', value: '+27%' },
      { label: 'Contrast failures', value: '0' },
    ],
    feedback: {
      quote:
        'Our engineers stopped asking design questions. The system answers them faster than we could.',
      author: 'Tomas Lindqvist',
      role: 'Head of Product, Kiln',
    },
  },
  {
    title: 'Static Bloom',
    subtitle: 'A poster series printed with generated plates',
    excerpt:
      'Two hundred risograph posters, no two identical — a generative system that outputs separated print plates.',
    description: `A self-initiated series exploring what happens when a generative system is built to output physical print plates instead of screen renders.

Each poster is a single run of a compositional algorithm constrained by risograph reality: four ink drums, deliberate misregistration, paper stretch. The system does not render a picture — it renders four separations plus a registration guide.

The full edition of two hundred sold out in nine days. The source is open, so anyone with a riso can print their own variant.`,
    category: 'Editorial',
    tags: ['Print', 'Illustration', 'Art Direction'],
    client: 'Self-initiated',
    role: 'Concept, generative system, production',
    year: 2023,
    duration: '7 weeks',
    accent: '#F472B6',
    secondary: '#22D3EE',
    featured: false,
    variant: 'bloom',
    deliverables: ['Edition of 200', 'Generative plate system', 'Print specification', 'Open-source release'],
    palette: [
      { name: 'Fluorescent Pink', hex: '#F472B6', usage: 'Drum 1' },
      { name: 'Aqua', hex: '#22D3EE', usage: 'Drum 2' },
      { name: 'Yellow', hex: '#FACC15', usage: 'Drum 3' },
      { name: 'Black', hex: '#111111', usage: 'Drum 4' },
    ],
    typography: [
      { family: 'Favorit', role: 'Poster type', weights: '400 / 700', sample: 'STATIC BLOOM' },
      { family: 'Favorit Mono', role: 'Edition numbering', weights: '400', sample: '№ 043 / 200' },
    ],
    processSteps: [
      {
        title: 'Constraints',
        body: 'Four weeks of test prints to characterise how the riso actually behaves: ink density curves, registration drift, paper stretch.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'System',
        body: 'A compositional algorithm written against those measured constraints, outputting four separations rather than a flat image.',
        duration: 'Weeks 3–5',
      },
      {
        title: 'Print',
        body: 'Two hundred unique runs, hand-fed, with deliberate misregistration tolerances baked into the plate generation.',
        duration: 'Weeks 6–7',
      },
      {
        title: 'Release',
        body: 'Source published with the measured ink profiles so other studios can adapt the system to their own machines.',
        duration: 'Week 7',
      },
    ],
    metrics: [
      { label: 'Edition size', value: '200' },
      { label: 'Sold out in', value: '9 days' },
      { label: 'Unique compositions', value: '200' },
    ],
    feedback: {
      quote:
        'It is the first generative work I have seen that treats the printing press as the medium rather than an output device.',
      author: 'Hana Weiss',
      role: 'Curator, Type Directors Club',
    },
  },
];

const SERVICES = [
  {
    title: 'Brand Identity',
    description:
      'Marks, type systems and the rules that keep them coherent — built to survive contact with the real world, not just the case study.',
    icon: 'hexagon',
    features: ['Naming & positioning', 'Logotype & marks', 'Type systems', 'Brand books'],
    accent: '#8B5CF6',
    priceFrom: 'from £12,000',
  },
  {
    title: 'Art Direction',
    description:
      'Campaign and editorial direction from first concept through to final grade, including photography and illustration commissioning.',
    icon: 'aperture',
    features: ['Campaign concepts', 'Photography direction', 'Commissioning', 'Production oversight'],
    accent: '#22D3EE',
    priceFrom: 'from £8,000',
  },
  {
    title: 'Motion & 3D',
    description:
      'Title sequences, procedural systems and loops. Motion designed against a brief, not a plugin preset.',
    icon: 'orbit',
    features: ['Title sequences', 'Procedural systems', 'Product films', 'Motion guidelines'],
    accent: '#FACC15',
    priceFrom: 'from £9,500',
  },
  {
    title: 'Design Systems',
    description:
      'Component libraries and design tokens that engineers actually adopt, with documentation that answers questions before they are asked.',
    icon: 'grid',
    features: ['Token architecture', 'Component libraries', 'Accessibility audits', 'Living documentation'],
    accent: '#34D399',
    priceFrom: 'from £15,000',
  },
  {
    title: 'Packaging',
    description:
      'Structure, surface and shelf logic — including artwork automation so a growing range stays consistent without a designer in the loop.',
    icon: 'package',
    features: ['Structural design', 'Range architecture', 'Artwork automation', 'Print specification'],
    accent: '#F472B6',
    priceFrom: 'from £11,000',
  },
  {
    title: 'Creative Consulting',
    description:
      'Short engagements for teams that have the talent but not the direction. Audits, critique sessions and hiring support.',
    icon: 'compass',
    features: ['Design audits', 'Critique facilitation', 'Team structure', 'Hiring & portfolio review'],
    accent: '#A78BFA',
    priceFrom: 'from £2,400/day',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ilse Brandt',
    role: 'Founder',
    company: 'Nocturne',
    quote:
      'We asked for a logo and got a way of seeing the room. Six months on, regulars describe the space using language straight out of the brand book.',
    featured: true,
  },
  {
    name: 'Devan Ross',
    role: 'Editor-in-chief',
    company: 'Meridian Press',
    quote:
      'The layout does half the editing for us now. When an essay does not earn its space, the grid makes that painfully obvious.',
    featured: true,
  },
  {
    name: 'Priya Anand',
    role: 'Brand Director',
    company: 'Halo Botanics',
    quote:
      'Retail buyers use our shelf as the reference when they brief other brands. In eleven years that has never happened to us.',
    featured: true,
  },
  {
    name: 'Tomas Lindqvist',
    role: 'Head of Product',
    company: 'Kiln',
    quote:
      'Our engineers stopped asking design questions. The system answers them faster than we could, and it answers them the same way every time.',
    featured: false,
  },
  {
    name: 'Marta Kalu',
    role: 'Director',
    company: 'Fieldwork Films',
    quote:
      'Three separate people asked which storm we filmed for the titles. There is no footage in the sequence at all.',
    featured: false,
  },
  {
    name: 'Hana Weiss',
    role: 'Curator',
    company: 'Type Directors Club',
    quote:
      'The first generative work I have seen that treats the printing press as the medium rather than an output device.',
    featured: false,
  },
];

const CLIENTS = [
  'Nocturne',
  'Meridian Press',
  'Halo Botanics',
  'Fieldwork Films',
  'Kiln',
  'Atlas Foundry',
  'Northbound',
  'Verso Studio',
  'Chroma Labs',
  'Field Notes Co.',
  'Lumen',
  'Slow Radio',
];

const AWARDS = [
  {
    title: 'Brand Identity of the Year',
    organization: 'Type Directors Club',
    year: 2024,
    description: 'Awarded for the Nocturne identity and its variable display typeface.',
  },
  {
    title: 'Editorial Design — Gold',
    organization: 'D&AD',
    year: 2024,
    description: 'Meridian Press, for the asymmetric argument grid.',
  },
  {
    title: 'Packaging Systems — Silver',
    organization: 'Dieline Awards',
    year: 2023,
    description: 'Halo Botanics, recognised for range architecture and material reduction.',
  },
  {
    title: 'Motion Graphics — Shortlist',
    organization: 'SXSW Film Design',
    year: 2024,
    description: 'Vector Field title sequence.',
  },
  {
    title: 'Design System of the Year — Finalist',
    organization: 'Awwwards',
    year: 2023,
    description: 'Kiln, for dynamic palette extraction with guaranteed contrast.',
  },
  {
    title: 'Young Designer to Watch',
    organization: 'Creative Review',
    year: 2022,
    description: 'Annual list of twenty designers shaping the next decade.',
  },
];

// ── Seed runner ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n▸ Seeding portfolio database…\n');

  // 1. Administrator
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: { name: env.ADMIN_NAME, role: 'ADMIN', active: true },
    create: { email: env.ADMIN_EMAIL, name: env.ADMIN_NAME, role: 'ADMIN', passwordHash },
  });
  console.log(`  ✓ administrator  ${admin.email}`);

  // 2. Site settings
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      ownerName: 'Rohit',
      role: 'Graphic Designer & Visual Storyteller',
      headline: 'CREATIVITY WITHOUT LIMITS',
      tagline: 'Design that refuses to sit still.',
      bio: `I build identity systems, editorial layouts and motion work for people who would rather be remembered than be safe.

Nine years in, across studios in three cities, the thing I care about has not changed: design should carry an argument. A mark should mean something before it looks like anything. A grid should have a point of view. A title sequence should earn its ninety seconds.

I work with a small number of clients each year, usually from first principles through to production. If your project has a real question at the centre of it, we will get on.`,
      email: 'hello@rohit.studio',
      phone: null,
      location: 'Bengaluru — working worldwide',
      availability: 'Taking two projects for Q1',
      socials: [
        { label: 'Behance', url: 'https://www.behance.net/', handle: '@rohit' },
        { label: 'Dribbble', url: 'https://dribbble.com/', handle: '@rohit' },
        { label: 'Instagram', url: 'https://www.instagram.com/', handle: '@rohit.studio' },
        { label: 'LinkedIn', url: 'https://www.linkedin.com/', handle: 'in/rohit' },
      ],
      stats: [
        { label: 'Projects delivered', value: 128, suffix: '+' },
        { label: 'Years designing', value: 9, suffix: '' },
        { label: 'Awards & selections', value: 14, suffix: '' },
        { label: 'Countries worked in', value: 11, suffix: '' },
      ],
      timeline: [
        {
          year: '2016',
          title: 'First studio',
          organisation: 'Verso Studio, Mumbai',
          body: 'Junior designer on packaging and retail. Learned that a beautiful comp means nothing if it cannot survive a print run.',
        },
        {
          year: '2018',
          title: 'Moved to editorial',
          organisation: 'Atlas Foundry, Berlin',
          body: 'Three years of long-form layout and type design. Where the obsession with grids started.',
        },
        {
          year: '2021',
          title: 'Art Director',
          organisation: 'Chroma Labs',
          body: 'Led a team of six across brand and motion. First title sequence, first festival selection.',
        },
        {
          year: '2023',
          title: 'Independent',
          organisation: 'Own practice',
          body: 'Went out on my own to take fewer projects and go deeper on each one.',
        },
        {
          year: '2025',
          title: 'Now',
          organisation: 'Bengaluru — worldwide',
          body: 'Identity, editorial and motion for clients who want an argument, not a mood board.',
        },
      ],
      skills: [
        { name: 'Brand Identity', level: 96, group: 'Design' },
        { name: 'Typography', level: 94, group: 'Design' },
        { name: 'Editorial', level: 90, group: 'Design' },
        { name: 'Art Direction', level: 92, group: 'Design' },
        { name: 'Packaging', level: 84, group: 'Design' },
        { name: 'Motion Design', level: 88, group: 'Motion' },
        { name: 'Cinema 4D', level: 80, group: 'Motion' },
        { name: 'Houdini', level: 68, group: 'Motion' },
        { name: 'After Effects', level: 90, group: 'Motion' },
        { name: 'Figma', level: 95, group: 'Tools' },
        { name: 'Illustrator', level: 93, group: 'Tools' },
        { name: 'Photoshop', level: 91, group: 'Tools' },
        { name: 'InDesign', level: 89, group: 'Tools' },
        { name: 'Blender', level: 74, group: 'Tools' },
        { name: 'Design Systems', level: 86, group: 'Strategy' },
        { name: 'Creative Direction', level: 88, group: 'Strategy' },
        { name: 'Research', level: 82, group: 'Strategy' },
        { name: 'Workshops', level: 79, group: 'Strategy' },
      ],
      philosophy: [
        {
          title: 'Argument before aesthetic',
          body: 'Every project starts with a question worth answering. The look is the consequence, never the brief.',
        },
        {
          title: 'Design for the worst case',
          body: 'A mark that only works at hero size is a drawing, not an identity. I test at 12px and four metres first.',
        },
        {
          title: 'Systems outlive campaigns',
          body: 'The deliverable is not the artwork — it is the reasoning that lets your team make the next hundred decisions without me.',
        },
        {
          title: 'Restraint is a feature',
          body: 'Anything that does not carry meaning gets cut. What survives has to work harder.',
        },
      ],
      seo: {
        title: 'Rohit — Graphic Designer & Visual Storyteller',
        description:
          'Identity systems, editorial design and motion work for clients who would rather be remembered than be safe.',
        keywords: [
          'graphic designer',
          'brand identity',
          'editorial design',
          'motion design',
          'art direction',
          'design systems',
        ],
        twitterHandle: '@rohit',
        robots: 'index, follow',
      },
      theme: { accent: '#8B5CF6', highlight: '#22D3EE', grain: true, intro: true, cursor: true },
    },
  });
  console.log('  ✓ site settings');

  // 3. Taxonomy
  const categories = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const record = await prisma.category.upsert({
      where: { slug },
      update: { color: category.color, description: category.description, order: index },
      create: { ...category, slug, order: index },
    });
    categories.set(category.name, record.id);
  }

  const tags = new Map<string, string>();
  for (const name of TAGS) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const record = await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
    tags.set(name, record.id);
  }
  console.log(`  ✓ ${categories.size} categories, ${tags.size} tags`);

  // 4. Projects with generated artwork
  for (const [index, project] of PROJECTS.entries()) {
    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      console.log(`  – ${project.title} already present, skipping`);
      continue;
    }

    const baseSeed = 1000 + index * 97;
    const cover = await storeArtwork(`${slug}-cover`, {
      width: 1800,
      height: 2250,
      accent: project.accent,
      secondary: project.secondary,
      seed: baseSeed,
      variant: project.variant,
    });

    const gallery = [];
    const kinds = ['SKETCH', 'PROCESS', 'OUTPUT', 'GALLERY', 'GALLERY', 'GALLERY'] as const;
    for (let i = 0; i < kinds.length; i += 1) {
      const media = await storeArtwork(`${slug}-${i + 1}`, {
        width: i % 3 === 0 ? 2000 : 1600,
        height: i % 3 === 0 ? 1250 : 1600,
        accent: i % 2 === 0 ? project.accent : project.secondary,
        secondary: i % 2 === 0 ? project.secondary : project.accent,
        seed: baseSeed + i * 13,
        variant: (['orbit', 'strata', 'grid', 'bloom'] as const)[i % 4],
      });
      gallery.push({
        mediaId: media.id,
        kind: kinds[i]!,
        order: i,
        span: i % 3 === 0 ? 2 : 1,
        caption: null,
      });
    }

    await prisma.project.create({
      data: {
        title: project.title,
        slug,
        subtitle: project.subtitle,
        excerpt: project.excerpt,
        description: project.description,
        status: 'PUBLISHED',
        featured: project.featured,
        order: index,
        client: project.client,
        role: project.role,
        year: project.year,
        duration: project.duration,
        deliverables: project.deliverables,
        technologies: [],
        accentColor: project.accent,
        secondaryColor: project.secondary,
        palette: project.palette,
        typography: project.typography,
        processSteps: project.processSteps,
        metrics: project.metrics,
        feedback: project.feedback,
        seoTitle: `${project.title} — ${project.subtitle}`,
        seoDescription: project.excerpt.slice(0, 175),
        coverId: cover.id,
        ogImageId: cover.id,
        categoryId: categories.get(project.category) ?? null,
        publishedAt: new Date(Date.now() - index * 86_400_000 * 21),
        views: Math.floor(400 + Math.random() * 2600),
        tags: {
          create: project.tags
            .map((name) => tags.get(name))
            .filter((id): id is string => Boolean(id))
            .map((tagId) => ({ tagId })),
        },
        gallery: { create: gallery },
      },
    });

    console.log(`  ✓ ${project.title}  (${gallery.length + 1} assets)`);
  }

  // 5. Services
  for (const [index, service] of SERVICES.entries()) {
    const existing = await prisma.service.findFirst({ where: { title: service.title } });
    if (existing) continue;
    await prisma.service.create({ data: { ...service, order: index } });
  }
  console.log(`  ✓ ${SERVICES.length} services`);

  // 6. Testimonials
  for (const [index, testimonial] of TESTIMONIALS.entries()) {
    const existing = await prisma.testimonial.findFirst({
      where: { name: testimonial.name, company: testimonial.company },
    });
    if (existing) continue;
    await prisma.testimonial.create({ data: { ...testimonial, order: index, rating: 5 } });
  }
  console.log(`  ✓ ${TESTIMONIALS.length} testimonials`);

  // 7. Clients
  for (const [index, name] of CLIENTS.entries()) {
    const existing = await prisma.client.findFirst({ where: { name } });
    if (existing) continue;
    await prisma.client.create({
      data: { name, wordmark: name, order: index, published: true },
    });
  }
  console.log(`  ✓ ${CLIENTS.length} clients`);

  // 8. Awards
  for (const [index, award] of AWARDS.entries()) {
    const existing = await prisma.award.findFirst({
      where: { title: award.title, organization: award.organization },
    });
    if (existing) continue;
    await prisma.award.create({ data: { ...award, order: index } });
  }
  console.log(`  ✓ ${AWARDS.length} awards`);

  console.log(`\n▸ Done.\n  Sign in at /admin with ${env.ADMIN_EMAIL}\n`);
}

main()
  .catch((error) => {
    console.error('\n✖ Seed failed:\n', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
