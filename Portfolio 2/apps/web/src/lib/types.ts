export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type MediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'LOTTIE';
export type ProjectMediaKind = 'GALLERY' | 'SKETCH' | 'PROCESS' | 'OUTPUT' | 'BEFORE' | 'AFTER';
export type ContactStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED' | 'SPAM';

export interface MediaRef {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  mimeType?: string;
  kind?: MediaKind;
}

export interface MediaAsset extends MediaRef {
  filename: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  folderId: string | null;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  _count?: { media: number; children: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  order: number;
  _count?: { projects: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: { projects: number };
}

export interface PaletteEntry {
  name: string;
  hex: string;
  usage: string;
}

export interface TypographyEntry {
  family: string;
  role: string;
  weights: string;
  sample: string;
}

export interface ProcessStep {
  title: string;
  body: string;
  duration: string;
}

export interface Metric {
  label: string;
  value: string;
}

export interface Feedback {
  quote: string;
  author: string;
  role: string;
  avatarUrl?: string | null;
}

export interface GalleryItem {
  id: string;
  kind: ProjectMediaKind;
  caption: string | null;
  span: number;
  order: number;
  media: MediaRef;
}

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  featured: boolean;
  year: number | null;
  client: string | null;
  accentColor: string;
  secondaryColor: string;
  views: number;
  heroVideoUrl: string | null;
  category: Pick<Category, 'id' | 'name' | 'slug' | 'color'> | null;
  tags: Tag[];
  cover: MediaRef | null;
}

export interface Project extends ProjectSummary {
  description: string;
  status: ProjectStatus;
  order: number;
  role: string | null;
  duration: string | null;
  deliverables: string[];
  technologies: string[];
  palette: PaletteEntry[];
  typography: TypographyEntry[];
  processSteps: ProcessStep[];
  metrics: Metric[];
  feedback: Feedback | null;
  liveUrl: string | null;
  behanceUrl: string | null;
  dribbbleUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  categoryId: string | null;
  coverId: string | null;
  ogImageId: string | null;
  ogImage: MediaRef | null;
  gallery: GalleryItem[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNeighbour {
  slug: string;
  title: string;
  subtitle: string | null;
  accentColor: string;
  cover: MediaRef | null;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  accent: string;
  priceFrom: string | null;
  published: boolean;
  order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  rating: number;
  featured: boolean;
  published: boolean;
  order: number;
  avatar: MediaRef | null;
}

export interface ClientLogo {
  id: string;
  name: string;
  url: string | null;
  wordmark: string | null;
  published: boolean;
  order: number;
  logo: MediaRef | null;
}

export interface Award {
  id: string;
  title: string;
  organization: string;
  year: number;
  description: string | null;
  url: string | null;
  published: boolean;
  order: number;
}

export interface Social {
  label: string;
  url: string;
  handle: string;
}

export interface Stat {
  label: string;
  value: number;
  suffix: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  organisation: string;
  body: string;
}

export interface SkillNode {
  name: string;
  level: number;
  group: string;
}

export interface Philosophy {
  title: string;
  body: string;
}

export interface SeoSettings {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImageUrl?: string | null;
  twitterHandle?: string;
  canonicalUrl?: string | null;
  robots?: string;
}

export interface ThemeSettings {
  accent?: string;
  highlight?: string;
  grain?: boolean;
  intro?: boolean;
  cursor?: boolean;
}

export interface SiteSettings {
  id: string;
  ownerName: string;
  role: string;
  headline: string;
  tagline: string;
  bio: string;
  email: string;
  phone: string | null;
  location: string;
  availability: string;
  resumeUrl: string | null;
  socials: Social[];
  stats: Stat[];
  timeline: TimelineEntry[];
  skills: SkillNode[];
  philosophy: Philosophy[];
  seo: SeoSettings;
  theme: ThemeSettings;
  updatedAt: string;
}

export interface Bootstrap {
  settings: SiteSettings;
  projects: ProjectSummary[];
  categories: Category[];
  services: Service[];
  testimonials: Testimonial[];
  clients: ClientLogo[];
  awards: Award[];
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  budget: string | null;
  message: string;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  unread?: number;
}

export interface AnalyticsOverview {
  rangeDays: number;
  views: number;
  previousViews: number;
  changePercent: number;
  visitors: number;
  contactRequests: number;
  publishedProjects: number;
  downloads: number;
}

export interface AnalyticsPoint {
  date: string;
  views: number;
  visitors: number;
}

export interface AnalyticsBreakdown {
  topPages: { path: string; views: number }[];
  devices: { device: string; views: number }[];
  referrers: { source: string; views: number }[];
  topProjects: { id: string; title: string; slug: string; views: number; accentColor: string }[];
  events: { type: string; count: number }[];
}
