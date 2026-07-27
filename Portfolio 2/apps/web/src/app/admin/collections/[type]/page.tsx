'use client';

import { notFound, useParams } from 'next/navigation';
import { CollectionManager, type CollectionConfig } from '@/components/admin/CollectionManager';

const CONFIGS: Record<string, CollectionConfig> = {
  categories: {
    resource: 'categories',
    title: 'Categories',
    description: 'The disciplines projects are grouped by. Shown as chips on cards and in the marquee.',
    singular: 'Category',
    primaryKey: 'name',
    secondaryKey: 'slug',
    colorKey: 'color',
    orderable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Brand Identity' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What this covers.' },
      { key: 'color', label: 'Accent colour', type: 'color' },
    ],
    defaults: { name: '', description: '', color: '#8B5CF6', order: 0 },
  },

  tags: {
    resource: 'tags',
    title: 'Tags',
    description: 'Fine-grained labels applied to projects — disciplines, techniques, deliverables.',
    singular: 'Tag',
    primaryKey: 'name',
    secondaryKey: 'slug',
    fields: [{ key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Typography' }],
    defaults: { name: '' },
  },

  services: {
    resource: 'services',
    title: 'Services',
    description: 'What you offer. Rendered as the 3D hover cards on the home page.',
    singular: 'Service',
    primaryKey: 'title',
    secondaryKey: 'description',
    colorKey: 'accent',
    orderable: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Brand Identity' },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      {
        key: 'icon',
        label: 'Icon',
        type: 'select',
        options: [
          { value: 'hexagon', label: 'Hexagon' },
          { value: 'aperture', label: 'Aperture' },
          { value: 'orbit', label: 'Orbit' },
          { value: 'grid', label: 'Grid' },
          { value: 'package', label: 'Package' },
          { value: 'compass', label: 'Compass' },
          { value: 'box', label: 'Box' },
          { value: 'sparkles', label: 'Sparkles' },
        ],
      },
      { key: 'features', label: 'What is included', type: 'list', placeholder: 'Logotype & marks' },
      { key: 'accent', label: 'Accent colour', type: 'color' },
      { key: 'priceFrom', label: 'Price indication', type: 'text', placeholder: 'from £12,000' },
      { key: 'published', label: 'Published', type: 'switch', hint: 'Visible on the site' },
    ],
    defaults: {
      title: '',
      description: '',
      icon: 'sparkles',
      features: [],
      accent: '#8B5CF6',
      priceFrom: '',
      published: true,
      order: 0,
    },
  },

  testimonials: {
    resource: 'testimonials',
    title: 'Testimonials',
    description: 'Client quotes shown in the floating glass stack.',
    singular: 'Testimonial',
    primaryKey: 'name',
    secondaryKey: 'quote',
    mediaKey: 'avatar',
    orderable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', placeholder: 'Founder' },
      { key: 'company', label: 'Company', type: 'text', placeholder: 'Nocturne' },
      { key: 'quote', label: 'Quote', type: 'textarea', required: true },
      { key: 'rating', label: 'Rating', type: 'number', min: 1, max: 5 },
      { key: 'avatar', label: 'Avatar', type: 'media' },
      { key: 'featured', label: 'Featured', type: 'switch', hint: 'Prioritised in the rotation' },
      { key: 'published', label: 'Published', type: 'switch' },
    ],
    defaults: {
      name: '',
      role: '',
      company: '',
      quote: '',
      rating: 5,
      avatar: null,
      featured: false,
      published: true,
      order: 0,
    },
  },

  clients: {
    resource: 'clients',
    title: 'Clients',
    description: 'Logos and wordmarks for the infinite marquee. A wordmark is used when no logo is uploaded.',
    singular: 'Client',
    primaryKey: 'name',
    secondaryKey: 'url',
    mediaKey: 'logo',
    orderable: true,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'wordmark', label: 'Wordmark', type: 'text', hint: 'Falls back to the name' },
      { key: 'url', label: 'Website', type: 'url', placeholder: 'https://' },
      { key: 'logo', label: 'Logo', type: 'media' },
      { key: 'published', label: 'Published', type: 'switch' },
    ],
    defaults: { name: '', wordmark: '', url: '', logo: null, published: true, order: 0 },
  },

  awards: {
    resource: 'awards',
    title: 'Awards',
    description: 'Recognition, grouped by year on the timeline.',
    singular: 'Award',
    primaryKey: 'title',
    secondaryKey: 'organization',
    orderable: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'organization', label: 'Awarded by', type: 'text', required: true },
      { key: 'year', label: 'Year', type: 'number', min: 1990, max: 2100 },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'url', label: 'Link', type: 'url', placeholder: 'https://' },
      { key: 'published', label: 'Published', type: 'switch' },
    ],
    defaults: {
      title: '',
      organization: '',
      year: new Date().getFullYear(),
      description: '',
      url: '',
      published: true,
      order: 0,
    },
  },
};

export default function CollectionPage() {
  const params = useParams<{ type: string }>();
  const config = CONFIGS[params.type];

  if (!config) notFound();

  return <CollectionManager config={config} />;
}
