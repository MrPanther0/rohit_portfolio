/**
 * Bundled content used whenever the API is unreachable — a fresh clone, a cold
 * database, or a transient outage. The site stays fully navigable and every
 * visual is generated procedurally, so no fixture images are shipped.
 */
import type { Bootstrap, Project, ProjectSummary, SiteSettings } from './types';

export const FALLBACK_SETTINGS: SiteSettings = {
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
  resumeUrl: null,
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
      year: 'Now',
      title: 'Selective practice',
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
    keywords: ['graphic designer', 'brand identity', 'editorial design', 'motion design', 'art direction'],
    twitterHandle: '@rohit',
    robots: 'index, follow',
  },
  theme: { accent: '#8B5CF6', highlight: '#22D3EE', grain: true, intro: true, cursor: true },
  updatedAt: new Date(0).toISOString(),
};

interface Seed {
  title: string;
  subtitle: string;
  excerpt: string;
  description: string;
  category: string;
  categoryColor: string;
  tags: string[];
  client: string;
  role: string;
  year: number;
  duration: string;
  accent: string;
  secondary: string;
  featured: boolean;
  deliverables: string[];
  palette: { name: string; hex: string; usage: string }[];
  typography: { family: string; role: string; weights: string; sample: string }[];
  process: { title: string; body: string; duration: string }[];
  metrics: { label: string; value: string }[];
  feedback: { quote: string; author: string; role: string };
}

const SEEDS: Seed[] = [
  {
    title: 'Nocturne',
    subtitle: 'An identity for a late-night listening room',
    excerpt:
      'A brand built for low light — a mark that resolves at a glance and a type system that behaves like sound.',
    description: `Nocturne is a listening room that opens when the rest of the city closes. The identity had to work in almost no light, on surfaces from vinyl sleeves to a projected wall, and read instantly from across a dark room.

The mark is a crescent cut from a circle — a moon, a speaker cone, a groove in a record, depending on where you meet it. Everything else in the system is deliberately quiet so the mark can carry the weight.

We drew a variable display face whose weight axis maps to volume: quiet copy sits at 200, a headline at 800. Applied across the space, the identity behaves less like a logo and more like a lighting rig.`,
    category: 'Brand Identity',
    categoryColor: '#8B5CF6',
    tags: ['Visual Identity', 'Typography', 'Art Direction'],
    client: 'Nocturne Listening Room',
    role: 'Identity design, art direction, type design',
    year: 2024,
    duration: '14 weeks',
    accent: '#8B5CF6',
    secondary: '#22D3EE',
    featured: true,
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
    process: [
      {
        title: 'Listening',
        body: 'Two weeks on site with the founders, sound engineers and regulars. Every decision traces to something observed in the room.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Marks',
        body: 'Forty crescent studies narrowed to three, stress-tested at 12px on a ticket stub and at four metres on the façade.',
        duration: 'Weeks 3–6',
      },
      {
        title: 'Type',
        body: 'A variable display face drawn from scratch, weight axis tuned to hold at low ambient light.',
        duration: 'Weeks 7–11',
      },
      {
        title: 'System',
        body: 'Signage, print, ticketing and a projection motion kit, delivered as a 96-page book plus a Figma library.',
        duration: 'Weeks 12–14',
      },
    ],
    metrics: [
      { label: 'Ticket sales, Q1', value: '+41%' },
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
    description: `Meridian publishes paired essays: two writers, one question, opposing answers. The brief was to make disagreement legible without turning it into a gimmick.

Each spread splits on an optical axis rather than a mathematical one, so the stronger argument physically occupies more of the page. Readers notice the imbalance before they finish the first paragraph.

The grid is a twelve-column asymmetric system with a floating baseline; footnotes migrate across the gutter and occasionally interrupt the opposing essay.`,
    category: 'Editorial',
    categoryColor: '#22D3EE',
    tags: ['Typography', 'Print', 'Art Direction'],
    client: 'Meridian Press',
    role: 'Editorial design, art direction',
    year: 2024,
    duration: '9 weeks + ongoing',
    accent: '#22D3EE',
    secondary: '#8B5CF6',
    featured: true,
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
    process: [
      {
        title: 'Reading',
        body: 'Every essay in the launch issue read twice before a single grid line was drawn.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Grid',
        body: 'An asymmetric twelve-column system with an optical centre line that shifts by up to 40mm.',
        duration: 'Weeks 3–5',
      },
      {
        title: 'Press',
        body: 'Four stocks and six ink pairings tested on press before settling on uncoated 90gsm with a fluorescent second hit.',
        duration: 'Weeks 6–7',
      },
      {
        title: 'Handover',
        body: 'A production specification detailed enough that the in-house team ships issues unsupervised.',
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
    description: `Twenty-four products, six concerns, three strengths — and a shelf where customers were spending ninety seconds working out which bottle they needed.

The system replaces category names with position on a continuous gradient that runs the length of the shelf. Strength reads vertically as a rising bar; concern reads horizontally as hue.

Every component is mono-material and ink coverage dropped 38% without losing shelf impact — the gradient does more work than a full-bleed print would.`,
    category: 'Packaging',
    categoryColor: '#F472B6',
    tags: ['Packaging', 'Design System', 'Illustration'],
    client: 'Halo Botanics',
    role: 'Packaging design, system design',
    year: 2023,
    duration: '18 weeks',
    accent: '#F472B6',
    secondary: '#FACC15',
    featured: true,
    deliverables: ['24 SKU artwork', 'Structural design', 'Shelf system', 'Artwork automation'],
    palette: [
      { name: 'Dawn', hex: '#FACC15', usage: 'Gradient origin — barrier' },
      { name: 'Bloom', hex: '#F472B6', usage: 'Gradient midpoint — repair' },
      { name: 'Dusk', hex: '#8B5CF6', usage: 'Gradient terminus — renewal' },
      { name: 'Clay', hex: '#1C1917', usage: 'Type and structure' },
    ],
    typography: [
      { family: 'GT Alpina', role: 'Product names', weights: '300 / 500', sample: 'Barrier Serum' },
      { family: 'Diatype Mono', role: 'Ingredients', weights: '400', sample: '12% NIACINAMIDE' },
    ],
    process: [
      {
        title: 'Shelf audit',
        body: 'Forty hours of filmed shelf observation across six stores, timing product selection.',
        duration: 'Weeks 1–3',
      },
      {
        title: 'Colour engineering',
        body: 'A perceptually uniform gradient built in OKLCH so adjacent SKUs stay distinguishable under retail lighting.',
        duration: 'Weeks 4–8',
      },
      {
        title: 'Structure',
        body: 'Mono-material bottles and cartons designed for kerbside recycling, prototyped across five rounds.',
        duration: 'Weeks 9–14',
      },
      {
        title: 'Automation',
        body: 'Parametric templates so new SKUs generate correct colour, position and copy without a designer.',
        duration: 'Weeks 15–18',
      },
    ],
    metrics: [
      { label: 'Time to select', value: '−62%' },
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
    description: `Opening titles for a feature documentary about people who chase storms. The director's only instruction: "it should feel like standing in it."

Rather than animate by hand, the sequence is driven by four days of anemometer data. Each particle samples the real vector field; the typography is displaced by the same forces. When the wind drops on day three, the titles go still — that pause is in the data, not the keyframes.`,
    category: 'Motion',
    categoryColor: '#FACC15',
    tags: ['Motion Design', '3D', 'Art Direction'],
    client: 'Fieldwork Films',
    role: 'Design & direction, procedural animation',
    year: 2024,
    duration: '11 weeks',
    accent: '#FACC15',
    secondary: '#22D3EE',
    featured: false,
    deliverables: ['90s title sequence', 'Lower-third kit', 'Poster series', 'Data stills'],
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
    process: [
      {
        title: 'Data',
        body: 'Four days of anemometer readings cleaned, resampled and converted into a volumetric vector field.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'Look development',
        body: 'Eleven particle systems tested against the film grade until one held at both cinema and phone scale.',
        duration: 'Weeks 3–6',
      },
      {
        title: 'Type in motion',
        body: 'Letterforms rebuilt as deformable meshes so the same forces displace the typography.',
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
      quote: 'Three separate people asked me which storm we filmed for the titles. There is no footage in it at all.',
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

The system extracts a palette from each photograph at upload and tints the surrounding interface with it — surfaces, focus rings, even checkout. The chrome recedes and the object leads.

Accessibility was the hard constraint: extracted colours pass through a contrast solver that guarantees WCAG AA against every text layer before they are painted.`,
    category: 'Digital Product',
    categoryColor: '#34D399',
    tags: ['Design System', 'Art Direction', 'Typography'],
    client: 'Kiln Marketplace',
    role: 'Design system, art direction',
    year: 2023,
    duration: '20 weeks',
    accent: '#34D399',
    secondary: '#8B5CF6',
    featured: false,
    deliverables: ['Component library (142)', 'Colour extraction spec', 'Motion guidelines', 'Docs site'],
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
    process: [
      {
        title: 'Audit',
        body: 'Twelve thousand product photographs analysed for hue distribution and contrast range.',
        duration: 'Weeks 1–4',
      },
      {
        title: 'Colour engine',
        body: 'A k-means extractor paired with an OKLCH contrast solver so every derived colour is legible before it ships.',
        duration: 'Weeks 5–11',
      },
      {
        title: 'Components',
        body: '142 components built against the dynamic palette, each tested at four extracted-colour extremes.',
        duration: 'Weeks 12–17',
      },
      {
        title: 'Documentation',
        body: 'A living docs site with copy-paste tokens and a colour sandbox for the engineering team.',
        duration: 'Weeks 18–20',
      },
    ],
    metrics: [
      { label: 'Components shipped', value: '142' },
      { label: 'Add-to-basket rate', value: '+27%' },
      { label: 'Contrast failures', value: '0' },
    ],
    feedback: {
      quote: 'Our engineers stopped asking design questions. The system answers them faster than we could.',
      author: 'Tomas Lindqvist',
      role: 'Head of Product, Kiln',
    },
  },
  {
    title: 'Static Bloom',
    subtitle: 'A poster series printed with generated plates',
    excerpt: 'Two hundred risograph posters, no two identical — a generative system that outputs print plates.',
    description: `A self-initiated series exploring what happens when a generative system is built to output physical print plates instead of screen renders.

Each poster is a single run of a compositional algorithm constrained by risograph reality: four ink drums, deliberate misregistration, paper stretch. The system does not render a picture — it renders four separations plus a registration guide.

The edition of two hundred sold out in nine days. The source is open, so anyone with a riso can print their own variant.`,
    category: 'Editorial',
    categoryColor: '#22D3EE',
    tags: ['Print', 'Illustration', 'Art Direction'],
    client: 'Self-initiated',
    role: 'Concept, generative system, production',
    year: 2023,
    duration: '7 weeks',
    accent: '#F472B6',
    secondary: '#22D3EE',
    featured: false,
    deliverables: ['Edition of 200', 'Generative plate system', 'Print specification', 'Open-source release'],
    palette: [
      { name: 'Fluorescent Pink', hex: '#F472B6', usage: 'Drum 1' },
      { name: 'Aqua', hex: '#22D3EE', usage: 'Drum 2' },
      { name: 'Yellow', hex: '#FACC15', usage: 'Drum 3' },
      { name: 'Black', hex: '#111111', usage: 'Drum 4' },
    ],
    typography: [
      { family: 'Favorit', role: 'Poster type', weights: '400 / 700', sample: 'STATIC BLOOM' },
      { family: 'Favorit Mono', role: 'Edition numbering', weights: '400', sample: 'No 043 / 200' },
    ],
    process: [
      {
        title: 'Constraints',
        body: 'Four weeks of test prints to characterise ink density curves, registration drift and paper stretch.',
        duration: 'Weeks 1–2',
      },
      {
        title: 'System',
        body: 'A compositional algorithm written against those measured constraints, outputting four separations.',
        duration: 'Weeks 3–5',
      },
      {
        title: 'Print',
        body: 'Two hundred unique runs, hand-fed, with deliberate misregistration tolerances baked into the plates.',
        duration: 'Weeks 6–7',
      },
      {
        title: 'Release',
        body: 'Source published with measured ink profiles so other studios can adapt it to their machines.',
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
        'The first generative work I have seen that treats the printing press as the medium rather than an output device.',
      author: 'Hana Weiss',
      role: 'Curator, Type Directors Club',
    },
  },
];

function slugOf(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function toProject(seed: Seed, index: number): Project {
  const slug = slugOf(seed.title);
  return {
    id: `fallback-${slug}`,
    title: seed.title,
    slug,
    subtitle: seed.subtitle,
    excerpt: seed.excerpt,
    description: seed.description,
    status: 'PUBLISHED',
    featured: seed.featured,
    order: index,
    client: seed.client,
    role: seed.role,
    year: seed.year,
    duration: seed.duration,
    deliverables: seed.deliverables,
    technologies: [],
    accentColor: seed.accent,
    secondaryColor: seed.secondary,
    palette: seed.palette,
    typography: seed.typography,
    processSteps: seed.process,
    metrics: seed.metrics,
    feedback: { ...seed.feedback, avatarUrl: null },
    heroVideoUrl: null,
    liveUrl: null,
    behanceUrl: null,
    dribbbleUrl: null,
    seoTitle: `${seed.title} — ${seed.subtitle}`,
    seoDescription: seed.excerpt.slice(0, 175),
    canonicalUrl: null,
    views: 0,
    categoryId: slugOf(seed.category),
    category: {
      id: slugOf(seed.category),
      name: seed.category,
      slug: slugOf(seed.category),
      color: seed.categoryColor,
    },
    tags: seed.tags.map((name) => ({ id: slugOf(name), name, slug: slugOf(name) })),
    cover: null,
    coverId: null,
    ogImageId: null,
    ogImage: null,
    // Six procedural panels per project — the gallery renders generated art when
    // no media record exists.
    gallery: Array.from({ length: 6 }, (_, i) => ({
      id: `${slug}-panel-${i}`,
      kind: (['SKETCH', 'PROCESS', 'OUTPUT', 'GALLERY', 'GALLERY', 'GALLERY'] as const)[i]!,
      caption: null,
      span: i % 3 === 0 ? 2 : 1,
      order: i,
      media: {
        id: `${slug}-media-${i}`,
        url: '',
        thumbnailUrl: null,
        alt: `${seed.title} — panel ${i + 1}`,
        width: i % 3 === 0 ? 2000 : 1600,
        height: i % 3 === 0 ? 1250 : 1600,
        blurDataUrl: null,
      },
    })),
    publishedAt: new Date(Date.UTC(seed.year, 5, 1)).toISOString(),
    createdAt: new Date(Date.UTC(seed.year, 0, 1)).toISOString(),
    updatedAt: new Date(Date.UTC(seed.year, 6, 1)).toISOString(),
  };
}

export const FALLBACK_PROJECTS: Project[] = SEEDS.map(toProject);

export const FALLBACK_SUMMARIES: ProjectSummary[] = FALLBACK_PROJECTS.map((project) => ({
  id: project.id,
  title: project.title,
  slug: project.slug,
  subtitle: project.subtitle,
  excerpt: project.excerpt,
  featured: project.featured,
  year: project.year,
  client: project.client,
  accentColor: project.accentColor,
  secondaryColor: project.secondaryColor,
  views: project.views,
  heroVideoUrl: null,
  category: project.category,
  tags: project.tags,
  cover: null,
}));

export const FALLBACK_BOOTSTRAP: Bootstrap = {
  settings: FALLBACK_SETTINGS,
  projects: FALLBACK_SUMMARIES,
  categories: [
    { id: 'brand-identity', name: 'Brand Identity', slug: 'brand-identity', description: null, color: '#8B5CF6', order: 0 },
    { id: 'editorial', name: 'Editorial', slug: 'editorial', description: null, color: '#22D3EE', order: 1 },
    { id: 'packaging', name: 'Packaging', slug: 'packaging', description: null, color: '#F472B6', order: 2 },
    { id: 'motion', name: 'Motion', slug: 'motion', description: null, color: '#FACC15', order: 3 },
    { id: 'digital-product', name: 'Digital Product', slug: 'digital-product', description: null, color: '#34D399', order: 4 },
  ],
  services: [
    {
      id: 'brand-identity',
      title: 'Brand Identity',
      description:
        'Marks, type systems and the rules that keep them coherent — built to survive contact with the real world, not just the case study.',
      icon: 'hexagon',
      features: ['Naming & positioning', 'Logotype & marks', 'Type systems', 'Brand books'],
      accent: '#8B5CF6',
      priceFrom: 'from £12,000',
      published: true,
      order: 0,
    },
    {
      id: 'art-direction',
      title: 'Art Direction',
      description:
        'Campaign and editorial direction from first concept through to final grade, including photography and illustration commissioning.',
      icon: 'aperture',
      features: ['Campaign concepts', 'Photography direction', 'Commissioning', 'Production oversight'],
      accent: '#22D3EE',
      priceFrom: 'from £8,000',
      published: true,
      order: 1,
    },
    {
      id: 'motion',
      title: 'Motion & 3D',
      description:
        'Title sequences, procedural systems and loops. Motion designed against a brief, not a plugin preset.',
      icon: 'orbit',
      features: ['Title sequences', 'Procedural systems', 'Product films', 'Motion guidelines'],
      accent: '#FACC15',
      priceFrom: 'from £9,500',
      published: true,
      order: 2,
    },
    {
      id: 'design-systems',
      title: 'Design Systems',
      description:
        'Component libraries and design tokens that engineers actually adopt, with documentation that answers questions before they are asked.',
      icon: 'grid',
      features: ['Token architecture', 'Component libraries', 'Accessibility audits', 'Living documentation'],
      accent: '#34D399',
      priceFrom: 'from £15,000',
      published: true,
      order: 3,
    },
    {
      id: 'packaging',
      title: 'Packaging',
      description:
        'Structure, surface and shelf logic — including artwork automation so a growing range stays consistent without a designer in the loop.',
      icon: 'package',
      features: ['Structural design', 'Range architecture', 'Artwork automation', 'Print specification'],
      accent: '#F472B6',
      priceFrom: 'from £11,000',
      published: true,
      order: 4,
    },
    {
      id: 'consulting',
      title: 'Creative Consulting',
      description:
        'Short engagements for teams that have the talent but not the direction. Audits, critique sessions and hiring support.',
      icon: 'compass',
      features: ['Design audits', 'Critique facilitation', 'Team structure', 'Portfolio review'],
      accent: '#A78BFA',
      priceFrom: 'from £2,400/day',
      published: true,
      order: 5,
    },
  ],
  testimonials: SEEDS.map((seed, index) => ({
    id: `fallback-testimonial-${index}`,
    name: seed.feedback.author,
    role: seed.feedback.role.split(',')[0]?.trim() ?? null,
    company: seed.feedback.role.split(',')[1]?.trim() ?? seed.client,
    quote: seed.feedback.quote,
    rating: 5,
    featured: index < 3,
    published: true,
    order: index,
    avatar: null,
  })),
  clients: [
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
  ].map((name, index) => ({
    id: `fallback-client-${index}`,
    name,
    url: null,
    wordmark: name,
    published: true,
    order: index,
    logo: null,
  })),
  awards: [
    {
      id: 'a1',
      title: 'Brand Identity of the Year',
      organization: 'Type Directors Club',
      year: 2024,
      description: 'Awarded for the Nocturne identity and its variable display typeface.',
      url: null,
      published: true,
      order: 0,
    },
    {
      id: 'a2',
      title: 'Editorial Design — Gold',
      organization: 'D&AD',
      year: 2024,
      description: 'Meridian Press, for the asymmetric argument grid.',
      url: null,
      published: true,
      order: 1,
    },
    {
      id: 'a3',
      title: 'Motion Graphics — Shortlist',
      organization: 'SXSW Film Design',
      year: 2024,
      description: 'Vector Field title sequence.',
      url: null,
      published: true,
      order: 2,
    },
    {
      id: 'a4',
      title: 'Packaging Systems — Silver',
      organization: 'Dieline Awards',
      year: 2023,
      description: 'Halo Botanics, recognised for range architecture and material reduction.',
      url: null,
      published: true,
      order: 3,
    },
    {
      id: 'a5',
      title: 'Design System of the Year — Finalist',
      organization: 'Awwwards',
      year: 2023,
      description: 'Kiln, for dynamic palette extraction with guaranteed contrast.',
      url: null,
      published: true,
      order: 4,
    },
    {
      id: 'a6',
      title: 'Young Designer to Watch',
      organization: 'Creative Review',
      year: 2022,
      description: 'Annual list of twenty designers shaping the next decade.',
      url: null,
      published: true,
      order: 5,
    },
  ],
};

export function fallbackProject(slug: string): Project | null {
  return FALLBACK_PROJECTS.find((project) => project.slug === slug) ?? null;
}

export function fallbackNeighbours(slug: string) {
  const index = FALLBACK_PROJECTS.findIndex((project) => project.slug === slug);
  if (index === -1) return { previous: null, next: null };
  const wrap = (i: number) => {
    const project = FALLBACK_PROJECTS[(i + FALLBACK_PROJECTS.length) % FALLBACK_PROJECTS.length]!;
    return {
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle,
      accentColor: project.accentColor,
      cover: null,
    };
  };
  return { previous: wrap(index - 1), next: wrap(index + 1) };
}
