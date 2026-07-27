'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, ImagePlus, Save, Trash2, X } from 'lucide-react';
import { useAdminAuth } from './AuthProvider';
import { PageHeader } from './AdminShell';
import { Badge, Button, Field, Input, Panel, Select, Spinner, Switch, Textarea } from './ui';
import { MediaPicker } from './MediaPicker';
import { MarkdownEditor } from './MarkdownEditor';
import { RepeatableList, StringListInput } from './RepeatableList';
import { ConfirmDialog } from './ConfirmDialog';
import type {
  Category,
  GalleryItem,
  MediaAsset,
  MediaRef,
  Project,
  ProjectMediaKind,
  ProjectStatus,
  Tag,
} from '@/lib/types';
import { cn, slugify } from '@/lib/utils';

type TabKey = 'content' | 'media' | 'case-study' | 'design' | 'seo';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'case-study', label: 'Case study' },
  { key: 'design', label: 'Design' },
  { key: 'seo', label: 'SEO' },
];

const GALLERY_KINDS: ProjectMediaKind[] = ['GALLERY', 'SKETCH', 'PROCESS', 'OUTPUT', 'BEFORE', 'AFTER'];

interface DraftGalleryItem {
  mediaId: string;
  kind: ProjectMediaKind;
  caption: string;
  span: number;
  order: number;
  media: MediaRef;
}

interface Draft {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  description: string;
  status: ProjectStatus;
  featured: boolean;
  client: string;
  role: string;
  year: string;
  duration: string;
  deliverables: string[];
  technologies: string[];
  accentColor: string;
  secondaryColor: string;
  palette: { name: string; hex: string; usage: string }[];
  typography: { family: string; role: string; weights: string; sample: string }[];
  processSteps: { title: string; body: string; duration: string }[];
  metrics: { label: string; value: string }[];
  feedbackQuote: string;
  feedbackAuthor: string;
  feedbackRole: string;
  heroVideoUrl: string;
  liveUrl: string;
  behanceUrl: string;
  dribbbleUrl: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  categoryId: string;
  tagIds: string[];
  cover: MediaRef | null;
  ogImage: MediaRef | null;
  gallery: DraftGalleryItem[];
}

const EMPTY_DRAFT: Draft = {
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  description: '',
  status: 'DRAFT',
  featured: false,
  client: '',
  role: '',
  year: String(new Date().getFullYear()),
  duration: '',
  deliverables: [],
  technologies: [],
  accentColor: '#8B5CF6',
  secondaryColor: '#22D3EE',
  palette: [],
  typography: [],
  processSteps: [],
  metrics: [],
  feedbackQuote: '',
  feedbackAuthor: '',
  feedbackRole: '',
  heroVideoUrl: '',
  liveUrl: '',
  behanceUrl: '',
  dribbbleUrl: '',
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  categoryId: '',
  tagIds: [],
  cover: null,
  ogImage: null,
  gallery: [],
};

function toDraft(project: Project): Draft {
  return {
    title: project.title,
    slug: project.slug,
    subtitle: project.subtitle ?? '',
    excerpt: project.excerpt ?? '',
    description: project.description ?? '',
    status: project.status,
    featured: project.featured,
    client: project.client ?? '',
    role: project.role ?? '',
    year: project.year ? String(project.year) : '',
    duration: project.duration ?? '',
    deliverables: project.deliverables ?? [],
    technologies: project.technologies ?? [],
    accentColor: project.accentColor,
    secondaryColor: project.secondaryColor,
    palette: project.palette ?? [],
    typography: project.typography ?? [],
    processSteps: project.processSteps ?? [],
    metrics: project.metrics ?? [],
    feedbackQuote: project.feedback?.quote ?? '',
    feedbackAuthor: project.feedback?.author ?? '',
    feedbackRole: project.feedback?.role ?? '',
    heroVideoUrl: project.heroVideoUrl ?? '',
    liveUrl: project.liveUrl ?? '',
    behanceUrl: project.behanceUrl ?? '',
    dribbbleUrl: project.dribbbleUrl ?? '',
    seoTitle: project.seoTitle ?? '',
    seoDescription: project.seoDescription ?? '',
    canonicalUrl: project.canonicalUrl ?? '',
    categoryId: project.categoryId ?? '',
    tagIds: project.tags.map((tag) => tag.id),
    cover: project.cover,
    ogImage: project.ogImage,
    gallery: project.gallery.map((item: GalleryItem, index) => ({
      mediaId: item.media.id,
      kind: item.kind,
      caption: item.caption ?? '',
      span: item.span,
      order: item.order ?? index,
      media: item.media,
    })),
  };
}

/** Maps the flat editing draft onto the API's nested payload. */
function toPayload(draft: Draft) {
  const nullable = (value: string) => (value.trim() ? value.trim() : null);

  return {
    title: draft.title.trim(),
    slug: draft.slug.trim() || slugify(draft.title),
    subtitle: nullable(draft.subtitle),
    excerpt: nullable(draft.excerpt),
    description: draft.description,
    status: draft.status,
    featured: draft.featured,
    client: nullable(draft.client),
    role: nullable(draft.role),
    year: draft.year ? Number(draft.year) : null,
    duration: nullable(draft.duration),
    deliverables: draft.deliverables,
    technologies: draft.technologies,
    accentColor: draft.accentColor,
    secondaryColor: draft.secondaryColor,
    palette: draft.palette,
    typography: draft.typography,
    processSteps: draft.processSteps,
    metrics: draft.metrics,
    feedback: draft.feedbackQuote.trim()
      ? {
          quote: draft.feedbackQuote.trim(),
          author: draft.feedbackAuthor.trim(),
          role: draft.feedbackRole.trim(),
          avatarUrl: null,
        }
      : null,
    heroVideoUrl: nullable(draft.heroVideoUrl),
    liveUrl: nullable(draft.liveUrl),
    behanceUrl: nullable(draft.behanceUrl),
    dribbbleUrl: nullable(draft.dribbbleUrl),
    seoTitle: nullable(draft.seoTitle),
    seoDescription: nullable(draft.seoDescription),
    canonicalUrl: nullable(draft.canonicalUrl),
    categoryId: draft.categoryId || null,
    coverId: draft.cover?.id ?? null,
    ogImageId: draft.ogImage?.id ?? null,
    tagIds: draft.tagIds,
    gallery: draft.gallery.map((item, index) => ({
      mediaId: item.mediaId,
      kind: item.kind,
      caption: item.caption.trim() || null,
      span: item.span,
      order: index,
    })),
  };
}

export function ProjectEditor({ projectId }: { projectId?: string }) {
  const { request, can } = useAdminAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>('content');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<'cover' | 'og' | 'gallery' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const slugTouched = useRef(Boolean(projectId));
  const readOnly = !can('EDITOR');

  const projectQuery = useQuery({
    queryKey: ['admin', 'project', projectId],
    queryFn: async () => (await request<Project>(`/api/admin/projects/${projectId}`)).data,
    enabled: Boolean(projectId),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await request<Category[]>('/api/admin/categories')).data,
  });

  const tagsQuery = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: async () => (await request<Tag[]>('/api/admin/tags')).data,
  });

  useEffect(() => {
    if (projectQuery.data) {
      setDraft(toDraft(projectQuery.data));
      setDirty(false);
    }
  }, [projectQuery.data]);

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (silent: boolean) => {
      const payload = toPayload(draft);
      if (!payload.title) throw new Error('A title is required');

      const response = projectId
        ? await request<Project>(`/api/admin/projects/${projectId}`, { method: 'PATCH', body: payload })
        : await request<Project>('/api/admin/projects', { method: 'POST', body: payload });

      return { project: response.data, silent };
    },
    onSuccess: ({ project, silent }) => {
      setDirty(false);
      setLastSaved(new Date());
      void queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });

      if (!projectId) {
        toast.success('Project created');
        router.replace(`/admin/projects/${project.id}`);
        return;
      }
      if (!silent) toast.success('Changes saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => request(`/api/admin/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Project deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      router.push('/admin/projects');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Warn before losing unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Cmd/Ctrl+S saves without leaving the keyboard.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!readOnly && dirty) saveMutation.mutate(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, readOnly, saveMutation]);

  const onPickMedia = (assets: MediaAsset[]) => {
    if (picker === 'cover' && assets[0]) set('cover', assets[0]);
    if (picker === 'og' && assets[0]) set('ogImage', assets[0]);
    if (picker === 'gallery') {
      const existing = new Set(draft.gallery.map((item) => item.mediaId));
      const additions = assets
        .filter((asset) => !existing.has(asset.id))
        .map((asset, index) => ({
          mediaId: asset.id,
          kind: 'GALLERY' as ProjectMediaKind,
          caption: '',
          span: 1,
          order: draft.gallery.length + index,
          media: asset as MediaRef,
        }));
      set('gallery', [...draft.gallery, ...additions]);
    }
    setPicker(null);
  };

  const updateGallery = (index: number, patch: Partial<DraftGalleryItem>) => {
    const next = [...draft.gallery];
    next[index] = { ...next[index]!, ...patch };
    set('gallery', next);
  };

  const moveGallery = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.gallery.length) return;
    const next = [...draft.gallery];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    set('gallery', next);
  };

  const autosave = useMemo(
    () =>
      projectId && !readOnly
        ? () => {
            if (dirty) saveMutation.mutate(true);
          }
        : undefined,
    [projectId, readOnly, dirty, saveMutation],
  );

  if (projectId && projectQuery.isLoading) return <Spinner label="Loading project" />;

  return (
    <>
      <PageHeader
        title={projectId ? draft.title || 'Untitled project' : 'New project'}
        description={
          projectId
            ? `/work/${draft.slug}${lastSaved ? ` · saved ${lastSaved.toLocaleTimeString()}` : ''}`
            : 'Everything except the title can be filled in later.'
        }
        actions={
          <>
            <Link href="/admin/projects">
              <Button icon={<ArrowLeft size={15} />}>Back</Button>
            </Link>

            {projectId && draft.status === 'PUBLISHED' ? (
              <Link href={`/work/${draft.slug}`} target="_blank">
                <Button icon={<ExternalLink size={15} />}>Preview</Button>
              </Link>
            ) : null}

            {projectId && can('ADMIN') ? (
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : null}

            {!readOnly ? (
              <Button
                variant="primary"
                icon={<Save size={15} />}
                loading={saveMutation.isPending}
                disabled={!dirty && Boolean(projectId)}
                onClick={() => saveMutation.mutate(false)}
              >
                {projectId ? 'Save changes' : 'Create project'}
              </Button>
            ) : null}
          </>
        }
      />

      {dirty ? (
        <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-200">
          Unsaved changes {autosave ? '· autosaving as you type' : ''}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/8" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative px-4 py-2.5 text-[13px] transition-colors duration-300',
              tab === item.key ? 'text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {item.label}
            {tab === item.key ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-ultraviolet to-signal" />
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {tab === 'content' ? (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Panel title="Essentials">
              <div className="space-y-5">
                <Field label="Title" required>
                  <Input
                    value={draft.title}
                    disabled={readOnly}
                    placeholder="Nocturne"
                    onChange={(event) => {
                      set('title', event.target.value);
                      if (!slugTouched.current) set('slug', slugify(event.target.value));
                    }}
                  />
                </Field>

                <Field label="Slug" hint="Used in the URL">
                  <Input
                    value={draft.slug}
                    disabled={readOnly}
                    placeholder="nocturne"
                    onChange={(event) => {
                      slugTouched.current = true;
                      set('slug', slugify(event.target.value));
                    }}
                    className="font-mono text-[13px]"
                  />
                </Field>

                <Field label="Subtitle">
                  <Input
                    value={draft.subtitle}
                    disabled={readOnly}
                    placeholder="An identity for a late-night listening room"
                    onChange={(event) => set('subtitle', event.target.value)}
                  />
                </Field>

                <Field label="Excerpt" hint={`${draft.excerpt.length}/400`}>
                  <Textarea
                    rows={3}
                    maxLength={400}
                    value={draft.excerpt}
                    disabled={readOnly}
                    placeholder="One sentence that makes someone want to open the case study."
                    onChange={(event) => set('excerpt', event.target.value)}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Case study body" description="Markdown, with live preview and autosave.">
              <MarkdownEditor
                value={draft.description}
                onChange={(value) => set('description', value)}
                onAutosave={autosave}
              />
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Publication">
              <div className="space-y-4">
                <Field label="Status">
                  <Select
                    value={draft.status}
                    disabled={readOnly}
                    onChange={(event) => set('status', event.target.value as ProjectStatus)}
                  >
                    <option value="DRAFT">Draft — hidden from the site</option>
                    <option value="PUBLISHED">Published — live</option>
                    <option value="ARCHIVED">Archived — hidden, kept</option>
                  </Select>
                </Field>

                <Switch
                  checked={draft.featured}
                  onChange={(value) => set('featured', value)}
                  label="Featured project"
                  description="Highlighted in the work gallery."
                />
              </div>
            </Panel>

            <Panel title="Classification">
              <div className="space-y-4">
                <Field label="Category">
                  <Select
                    value={draft.categoryId}
                    disabled={readOnly}
                    onChange={(event) => set('categoryId', event.target.value)}
                  >
                    <option value="">Uncategorised</option>
                    {categoriesQuery.data?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {tagsQuery.data?.length ? (
                      tagsQuery.data.map((tag) => {
                        const active = draft.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            disabled={readOnly}
                            onClick={() =>
                              set(
                                'tagIds',
                                active
                                  ? draft.tagIds.filter((id) => id !== tag.id)
                                  : [...draft.tagIds, tag.id],
                              )
                            }
                            aria-pressed={active}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-[12px] transition-colors duration-300',
                              active
                                ? 'border-transparent bg-white text-void'
                                : 'border-white/12 text-white/55 hover:border-white/30 hover:text-white',
                            )}
                          >
                            {tag.name}
                          </button>
                        );
                      })
                    ) : (
                      <Link href="/admin/collections/tags" className="text-[13px] text-ultraviolet-soft">
                        Create your first tag →
                      </Link>
                    )}
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel title="Engagement">
              <div className="space-y-4">
                <Field label="Client">
                  <Input
                    value={draft.client}
                    disabled={readOnly}
                    onChange={(event) => set('client', event.target.value)}
                  />
                </Field>
                <Field label="Your role">
                  <Input
                    value={draft.role}
                    disabled={readOnly}
                    placeholder="Identity design, art direction"
                    onChange={(event) => set('role', event.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year">
                    <Input
                      type="number"
                      min={1990}
                      max={2100}
                      value={draft.year}
                      disabled={readOnly}
                      onChange={(event) => set('year', event.target.value)}
                    />
                  </Field>
                  <Field label="Duration">
                    <Input
                      value={draft.duration}
                      disabled={readOnly}
                      placeholder="14 weeks"
                      onChange={(event) => set('duration', event.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Deliverables">
                  <StringListInput
                    value={draft.deliverables}
                    disabled={readOnly}
                    onChange={(value) => set('deliverables', value)}
                    placeholder={'Logotype & marks\nBrand book'}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Links">
              <div className="space-y-4">
                {(
                  [
                    ['liveUrl', 'Live project'],
                    ['behanceUrl', 'Behance'],
                    ['dribbbleUrl', 'Dribbble'],
                    ['heroVideoUrl', 'Hero video (mp4/webm)'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="url"
                      value={draft[key]}
                      disabled={readOnly}
                      placeholder="https://"
                      onChange={(event) => set(key, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {/* ── Media ───────────────────────────────────────────────────────── */}
      {tab === 'media' ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {(
              [
                ['cover', 'Cover image', 'Shown on the work gallery and at the top of the case study.'],
                ['og', 'Social share image', 'Used for Open Graph and Twitter cards. Falls back to the cover.'],
              ] as const
            ).map(([type, title, description]) => {
              const asset = type === 'cover' ? draft.cover : draft.ogImage;
              return (
                <Panel key={type} title={title} description={description}>
                  {asset ? (
                    <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/8">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.thumbnailUrl ?? asset.url}
                        alt={asset.alt ?? ''}
                        className="h-full w-full object-cover"
                      />
                      {!readOnly ? (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="sm" onClick={() => setPicker(type)}>
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => set(type === 'cover' ? 'cover' : 'ogImage', null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setPicker(type)}
                      className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed border-white/12 text-white/35 transition-colors hover:border-white/30 hover:text-white/60 disabled:opacity-40"
                    >
                      <span className="text-center">
                        <ImagePlus size={26} className="mx-auto" />
                        <span className="mt-2.5 block text-[13px]">Choose an image</span>
                      </span>
                    </button>
                  )}
                </Panel>
              );
            })}
          </div>

          <Panel
            title="Gallery"
            description="Order controls how the case study reads. Use BEFORE and AFTER together to render a comparison slider."
            actions={
              !readOnly ? (
                <Button icon={<ImagePlus size={15} />} onClick={() => setPicker('gallery')}>
                  Add assets
                </Button>
              ) : null
            }
          >
            {draft.gallery.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-[13px] text-white/30">
                No gallery assets yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {draft.gallery.map((item, index) => (
                  <li
                    key={item.mediaId}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.015] p-3"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/8">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.media.thumbnailUrl ?? item.media.url}
                        alt={item.media.alt ?? ''}
                        className="h-full w-full object-cover"
                      />
                    </span>

                    <Select
                      value={item.kind}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateGallery(index, { kind: event.target.value as ProjectMediaKind })
                      }
                      className="h-9 w-auto min-w-[120px] py-0 text-xs"
                      aria-label="Asset role"
                    >
                      {GALLERY_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </Select>

                    <Input
                      value={item.caption}
                      disabled={readOnly}
                      placeholder="Caption (optional)"
                      onChange={(event) => updateGallery(index, { caption: event.target.value })}
                      className="h-9 min-w-[160px] flex-1 py-0 text-[13px]"
                      aria-label="Caption"
                    />

                    <Select
                      value={String(item.span)}
                      disabled={readOnly}
                      onChange={(event) => updateGallery(index, { span: Number(event.target.value) })}
                      className="h-9 w-auto py-0 text-xs"
                      aria-label="Grid span"
                    >
                      <option value="1">1 column</option>
                      <option value="2">2 columns</option>
                      <option value="3">3 columns</option>
                    </Select>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveGallery(index, -1)}
                        disabled={index === 0 || readOnly}
                        aria-label="Move earlier"
                        className="grid h-8 w-8 place-items-center rounded-md text-white/35 hover:bg-white/[0.06] hover:text-white disabled:opacity-20"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGallery(index, 1)}
                        disabled={index === draft.gallery.length - 1 || readOnly}
                        aria-label="Move later"
                        className="grid h-8 w-8 place-items-center rounded-md text-white/35 hover:bg-white/[0.06] hover:text-white disabled:opacity-20"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            'gallery',
                            draft.gallery.filter((_, i) => i !== index),
                          )
                        }
                        disabled={readOnly}
                        aria-label="Remove from gallery"
                        className="grid h-8 w-8 place-items-center rounded-md text-white/35 hover:bg-red-500/15 hover:text-red-400 disabled:opacity-20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {/* ── Case study ──────────────────────────────────────────────────── */}
      {tab === 'case-study' ? (
        <div className="space-y-6">
          <Panel title="Process" description="The steps that made the outcome inevitable.">
            <RepeatableList
              items={draft.processSteps}
              disabled={readOnly}
              titleKey="title"
              fields={[
                { key: 'title', label: 'Step title', span: 8, placeholder: 'Listening' },
                { key: 'duration', label: 'Duration', span: 4, placeholder: 'Weeks 1–2' },
                { key: 'body', label: 'What happened', type: 'textarea', span: 12 },
              ]}
              template={() => ({ title: '', body: '', duration: '' })}
              onChange={(items) => set('processSteps', items)}
              addLabel="Add step"
              emptyLabel="No process steps yet."
              max={12}
            />
          </Panel>

          <Panel title="Outcome metrics" description="Three numbers that prove the work did something.">
            <RepeatableList
              items={draft.metrics}
              disabled={readOnly}
              titleKey="label"
              fields={[
                { key: 'value', label: 'Value', span: 4, placeholder: '+41%' },
                { key: 'label', label: 'Label', span: 8, placeholder: 'Ticket sales, first quarter' },
              ]}
              template={() => ({ label: '', value: '' })}
              onChange={(items) => set('metrics', items)}
              addLabel="Add metric"
              emptyLabel="No metrics yet."
              max={8}
            />
          </Panel>

          <Panel title="Client feedback">
            <div className="space-y-4">
              <Field label="Quote">
                <Textarea
                  rows={3}
                  value={draft.feedbackQuote}
                  disabled={readOnly}
                  onChange={(event) => set('feedbackQuote', event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Author">
                  <Input
                    value={draft.feedbackAuthor}
                    disabled={readOnly}
                    onChange={(event) => set('feedbackAuthor', event.target.value)}
                  />
                </Field>
                <Field label="Role & company">
                  <Input
                    value={draft.feedbackRole}
                    disabled={readOnly}
                    placeholder="Founder, Nocturne"
                    onChange={(event) => set('feedbackRole', event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {/* ── Design ──────────────────────────────────────────────────────── */}
      {tab === 'design' ? (
        <div className="space-y-6">
          <Panel title="Project accents" description="These tint the cursor, glow and gradients on the case study.">
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ['accentColor', 'Primary accent'],
                  ['secondaryColor', 'Secondary accent'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={draft[key]}
                      disabled={readOnly}
                      onChange={(event) => set(key, event.target.value.toUpperCase())}
                      className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                      aria-label={`${label} picker`}
                    />
                    <Input
                      value={draft[key]}
                      disabled={readOnly}
                      onChange={(event) => set(key, event.target.value.toUpperCase())}
                      className="font-mono text-[13px]"
                    />
                  </div>
                </Field>
              ))}
            </div>

            <div
              className="mt-5 h-24 rounded-xl border border-white/8"
              style={{
                background: `linear-gradient(120deg, ${draft.accentColor}, ${draft.secondaryColor})`,
              }}
              aria-hidden
            />
          </Panel>

          <Panel title="Colour palette" description="Documented on the case study page.">
            <RepeatableList
              items={draft.palette}
              disabled={readOnly}
              titleKey="name"
              fields={[
                { key: 'name', label: 'Name', span: 4, placeholder: 'Ultraviolet' },
                { key: 'hex', label: 'Hex', type: 'color', span: 4 },
                { key: 'usage', label: 'Usage', span: 4, placeholder: 'Primary accent' },
              ]}
              template={() => ({ name: '', hex: '#8B5CF6', usage: '' })}
              onChange={(items) => set('palette', items)}
              addLabel="Add colour"
              emptyLabel="No palette documented yet."
              max={24}
            />
          </Panel>

          <Panel title="Typography">
            <RepeatableList
              items={draft.typography}
              disabled={readOnly}
              titleKey="family"
              fields={[
                { key: 'family', label: 'Typeface', span: 6, placeholder: 'Söhne' },
                { key: 'role', label: 'Role', span: 6, placeholder: 'Body & interface' },
                { key: 'weights', label: 'Weights', span: 6, placeholder: '400 / 500' },
                { key: 'sample', label: 'Sample text', span: 6, placeholder: 'Doors at 22:00' },
              ]}
              template={() => ({ family: '', role: '', weights: '', sample: '' })}
              onChange={(items) => set('typography', items)}
              addLabel="Add typeface"
              emptyLabel="No typefaces documented yet."
              max={12}
            />
          </Panel>

          <Panel title="Technologies & tools">
            <StringListInput
              value={draft.technologies}
              disabled={readOnly}
              onChange={(value) => set('technologies', value)}
              placeholder={'Figma\nCinema 4D'}
            />
          </Panel>
        </div>
      ) : null}

      {/* ── SEO ─────────────────────────────────────────────────────────── */}
      {tab === 'seo' ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Search & social" description="Leave blank to derive from the title and excerpt.">
            <div className="space-y-5">
              <Field label="SEO title" hint={`${draft.seoTitle.length}/70`}>
                <Input
                  value={draft.seoTitle}
                  maxLength={70}
                  disabled={readOnly}
                  placeholder={`${draft.title} — ${draft.subtitle}`.slice(0, 70)}
                  onChange={(event) => set('seoTitle', event.target.value)}
                />
              </Field>

              <Field label="Meta description" hint={`${draft.seoDescription.length}/180`}>
                <Textarea
                  rows={3}
                  maxLength={180}
                  value={draft.seoDescription}
                  disabled={readOnly}
                  placeholder={draft.excerpt.slice(0, 175)}
                  onChange={(event) => set('seoDescription', event.target.value)}
                />
              </Field>

              <Field label="Canonical URL" hint="Only when this case study also lives elsewhere">
                <Input
                  type="url"
                  value={draft.canonicalUrl}
                  disabled={readOnly}
                  placeholder="https://"
                  onChange={(event) => set('canonicalUrl', event.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Search preview">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="truncate text-[13px] text-emerald-400/80">
                {typeof window !== 'undefined' ? window.location.origin : ''}/work/{draft.slug || 'slug'}
              </p>
              <p className="mt-1.5 truncate text-[17px] text-[#8ab4f8]">
                {draft.seoTitle || `${draft.title || 'Untitled'} — ${draft.subtitle}`}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[13px] text-white/45">
                {draft.seoDescription || draft.excerpt || 'No description yet.'}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Badge tone={draft.seoTitle.length > 0 && draft.seoTitle.length <= 60 ? 'success' : 'warning'}>
                title {draft.seoTitle.length || '0'} chars
              </Badge>
              <Badge
                tone={
                  draft.seoDescription.length >= 80 && draft.seoDescription.length <= 165
                    ? 'success'
                    : 'warning'
                }
                className="ml-2"
              >
                description {draft.seoDescription.length || '0'} chars
              </Badge>
            </div>
          </Panel>
        </div>
      ) : null}

      <MediaPicker
        open={picker !== null}
        multiple={picker === 'gallery'}
        onClose={() => setPicker(null)}
        onSelect={onPickMedia}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${draft.title}”?`}
        description="The project and its gallery links are removed permanently. Media stays in the library."
        confirmLabel="Delete project"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
