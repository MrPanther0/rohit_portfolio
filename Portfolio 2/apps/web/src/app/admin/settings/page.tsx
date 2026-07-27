'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Save, Upload } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Button, Field, Input, Panel, Spinner, Switch, Textarea } from '@/components/admin/ui';
import { RepeatableList } from '@/components/admin/RepeatableList';
import { MarkdownEditor } from '@/components/admin/MarkdownEditor';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { SiteSettings } from '@/lib/types';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

type TabKey = 'identity' | 'story' | 'skills' | 'seo' | 'theme' | 'account' | 'backup';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'identity', label: 'Identity' },
  { key: 'story', label: 'Story' },
  { key: 'skills', label: 'Skills' },
  { key: 'seo', label: 'SEO' },
  { key: 'theme', label: 'Theme' },
  { key: 'account', label: 'Account' },
  { key: 'backup', label: 'Backup' },
];

export default function AdminSettingsPage() {
  const { request, can, user, logout } = useAdminAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>('identity');
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [confirmRestore, setConfirmRestore] = useState<Record<string, unknown> | null>(null);

  const readOnly = !can('EDITOR');

  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await request<SiteSettings>('/api/admin/settings')).data,
  });

  useEffect(() => {
    if (query.data) {
      setDraft(query.data);
      setDirty(false);
    }
  }, [query.data]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Nothing to save');
      const { id, updatedAt, ...payload } = draft;
      void id;
      void updatedAt;
      return request('/api/admin/settings', { method: 'PATCH', body: payload });
    },
    onSuccess: () => {
      toast.success('Settings saved');
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (passwords.next !== passwords.confirm) throw new Error('The new passwords do not match');
      return request('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: passwords.current, newPassword: passwords.next },
      });
    },
    onSuccess: () => {
      toast.success('Password changed — signing you out of other devices');
      setPasswords({ current: '', next: '', confirm: '' });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const restoreMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      request('/api/admin/backup/import', { method: 'POST', body: { ...payload, replace: false } }),
    onSuccess: () => {
      toast.success('Backup imported');
      setConfirmRestore(null);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportBackup = async () => {
    try {
      const response = await request<unknown>('/api/admin/backup/export');
      const blob = new Blob([JSON.stringify(response.data ?? response, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch {
      // The export route streams a file rather than an envelope; fall back to a direct hit.
      window.open(`${API_URL}/api/admin/backup/export`, '_blank');
    }
  };

  if (query.isLoading || !draft) return <Spinner label="Loading settings" />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Everything the public site reads — copy, links, palette and SEO."
        actions={
          !readOnly ? (
            <Button
              variant="primary"
              icon={<Save size={15} />}
              loading={saveMutation.isPending}
              disabled={!dirty}
              onClick={() => saveMutation.mutate()}
            >
              Save changes
            </Button>
          ) : null
        }
      />

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

      {tab === 'identity' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Who you are">
            <div className="space-y-5">
              <Field label="Name" required>
                <Input
                  value={draft.ownerName}
                  disabled={readOnly}
                  onChange={(event) => set('ownerName', event.target.value)}
                />
              </Field>
              <Field label="Role">
                <Input
                  value={draft.role}
                  disabled={readOnly}
                  onChange={(event) => set('role', event.target.value)}
                />
              </Field>
              <Field label="Hero headline" hint="Each word becomes its own line">
                <Input
                  value={draft.headline}
                  disabled={readOnly}
                  onChange={(event) => set('headline', event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Tagline">
                <Input
                  value={draft.tagline}
                  disabled={readOnly}
                  onChange={(event) => set('tagline', event.target.value)}
                />
              </Field>
              <Field label="Availability" hint="Shown in the header and hero">
                <Input
                  value={draft.availability}
                  disabled={readOnly}
                  onChange={(event) => set('availability', event.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Contact">
              <div className="space-y-5">
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={draft.email}
                    disabled={readOnly}
                    onChange={(event) => set('email', event.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={draft.phone ?? ''}
                    disabled={readOnly}
                    onChange={(event) => set('phone', event.target.value || null)}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={draft.location}
                    disabled={readOnly}
                    onChange={(event) => set('location', event.target.value)}
                  />
                </Field>
                <Field label="CV / résumé URL">
                  <Input
                    type="url"
                    value={draft.resumeUrl ?? ''}
                    disabled={readOnly}
                    placeholder="https://"
                    onChange={(event) => set('resumeUrl', event.target.value || null)}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Social links">
              <RepeatableList
                items={draft.socials}
                disabled={readOnly}
                titleKey="label"
                fields={[
                  { key: 'label', label: 'Platform', span: 4, placeholder: 'Behance' },
                  { key: 'url', label: 'URL', type: 'url', span: 5, placeholder: 'https://' },
                  { key: 'handle', label: 'Handle', span: 3, placeholder: '@you' },
                ]}
                template={() => ({ label: '', url: '', handle: '' })}
                onChange={(items) => set('socials', items)}
                addLabel="Add link"
                emptyLabel="No social links yet."
                max={12}
              />
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === 'story' ? (
        <div className="space-y-6">
          <Panel title="Biography" description="Markdown. Rendered in the About section.">
            <MarkdownEditor
              value={draft.bio}
              onChange={(value) => set('bio', value)}
              rows={12}
              placeholder="Who you are and what you argue for."
            />
          </Panel>

          <Panel title="Statistics" description="Counted up as they scroll into view.">
            <RepeatableList
              items={draft.stats}
              disabled={readOnly}
              titleKey="label"
              fields={[
                { key: 'value', label: 'Value', type: 'number', span: 3 },
                { key: 'suffix', label: 'Suffix', span: 3, placeholder: '+' },
                { key: 'label', label: 'Label', span: 6, placeholder: 'Projects delivered' },
              ]}
              template={() => ({ label: '', value: 0, suffix: '+' })}
              onChange={(items) => set('stats', items)}
              addLabel="Add statistic"
              emptyLabel="No statistics yet."
              max={8}
            />
          </Panel>

          <Panel title="Career timeline">
            <RepeatableList
              items={draft.timeline}
              disabled={readOnly}
              titleKey="title"
              fields={[
                { key: 'year', label: 'Year', span: 3, placeholder: '2021' },
                { key: 'title', label: 'Title', span: 4, placeholder: 'Art Director' },
                { key: 'organisation', label: 'Organisation', span: 5, placeholder: 'Chroma Labs' },
                { key: 'body', label: 'What happened', type: 'textarea', span: 12 },
              ]}
              template={() => ({ year: '', title: '', organisation: '', body: '' })}
              onChange={(items) => set('timeline', items)}
              addLabel="Add entry"
              emptyLabel="No timeline entries yet."
              max={20}
            />
          </Panel>

          <Panel title="Design philosophy" description="The accordion beside the timeline.">
            <RepeatableList
              items={draft.philosophy}
              disabled={readOnly}
              titleKey="title"
              fields={[
                { key: 'title', label: 'Principle', span: 12, placeholder: 'Argument before aesthetic' },
                { key: 'body', label: 'Explanation', type: 'textarea', span: 12 },
              ]}
              template={() => ({ title: '', body: '' })}
              onChange={(items) => set('philosophy', items)}
              addLabel="Add principle"
              emptyLabel="No principles yet."
              max={8}
            />
          </Panel>
        </div>
      ) : null}

      {tab === 'skills' ? (
        <Panel
          title="Skills"
          description="Each entry becomes a node in the 3D constellation. Group names drive the colour coding — Design, Motion, Tools and Strategy are recognised."
        >
          <RepeatableList
            items={draft.skills}
            disabled={readOnly}
            titleKey="name"
            fields={[
              { key: 'name', label: 'Skill', span: 5, placeholder: 'Typography' },
              { key: 'group', label: 'Group', span: 4, placeholder: 'Design' },
              { key: 'level', label: 'Level (0–100)', type: 'number', span: 3, min: 0, max: 100 },
            ]}
            template={() => ({ name: '', group: 'Design', level: 80 })}
            onChange={(items) => set('skills', items)}
            addLabel="Add skill"
            emptyLabel="No skills yet — the constellation section stays hidden."
            max={60}
          />
        </Panel>
      ) : null}

      {tab === 'seo' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Search metadata">
            <div className="space-y-5">
              <Field label="Meta title" hint={`${(draft.seo?.title ?? '').length}/70`}>
                <Input
                  value={draft.seo?.title ?? ''}
                  maxLength={70}
                  disabled={readOnly}
                  onChange={(event) => set('seo', { ...draft.seo, title: event.target.value })}
                />
              </Field>
              <Field label="Meta description" hint={`${(draft.seo?.description ?? '').length}/180`}>
                <Textarea
                  rows={3}
                  maxLength={180}
                  value={draft.seo?.description ?? ''}
                  disabled={readOnly}
                  onChange={(event) => set('seo', { ...draft.seo, description: event.target.value })}
                />
              </Field>
              <Field label="Keywords" hint="Comma separated">
                <Input
                  value={(draft.seo?.keywords ?? []).join(', ')}
                  disabled={readOnly}
                  onChange={(event) =>
                    set('seo', {
                      ...draft.seo,
                      keywords: event.target.value
                        .split(',')
                        .map((keyword) => keyword.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Social share image URL">
                <Input
                  type="url"
                  value={draft.seo?.ogImageUrl ?? ''}
                  disabled={readOnly}
                  placeholder="https://"
                  onChange={(event) =>
                    set('seo', { ...draft.seo, ogImageUrl: event.target.value || null })
                  }
                />
              </Field>
              <Field label="Twitter handle">
                <Input
                  value={draft.seo?.twitterHandle ?? ''}
                  disabled={readOnly}
                  placeholder="@you"
                  onChange={(event) => set('seo', { ...draft.seo, twitterHandle: event.target.value })}
                />
              </Field>
              <Field label="Robots directive">
                <Input
                  value={draft.seo?.robots ?? 'index, follow'}
                  disabled={readOnly}
                  onChange={(event) => set('seo', { ...draft.seo, robots: event.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Search preview">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="truncate text-[13px] text-emerald-400/80">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </p>
              <p className="mt-1.5 truncate text-[17px] text-[#8ab4f8]">
                {draft.seo?.title || `${draft.ownerName} — ${draft.role}`}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[13px] text-white/45">
                {draft.seo?.description || draft.tagline}
              </p>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-white/35">
              The sitemap and robots.txt regenerate automatically from published projects. Structured data
              (Person, WebSite and CreativeWork) is emitted on every page.
            </p>
          </Panel>
        </div>
      ) : null}

      {tab === 'theme' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Palette" description="Applied to the shader, cursor, selection and scrollbar.">
            <div className="space-y-5">
              {(
                [
                  ['accent', 'Accent'],
                  ['highlight', 'Highlight'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={draft.theme?.[key] ?? (key === 'accent' ? '#8B5CF6' : '#22D3EE')}
                      disabled={readOnly}
                      onChange={(event) =>
                        set('theme', { ...draft.theme, [key]: event.target.value.toUpperCase() })
                      }
                      className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                      aria-label={`${label} picker`}
                    />
                    <Input
                      value={draft.theme?.[key] ?? ''}
                      disabled={readOnly}
                      placeholder={key === 'accent' ? '#8B5CF6' : '#22D3EE'}
                      onChange={(event) =>
                        set('theme', { ...draft.theme, [key]: event.target.value.toUpperCase() })
                      }
                      className="font-mono text-[13px]"
                    />
                  </div>
                </Field>
              ))}

              <div
                className="h-28 rounded-xl border border-white/8"
                style={{
                  background: `linear-gradient(120deg, ${draft.theme?.accent ?? '#8B5CF6'}, ${draft.theme?.highlight ?? '#22D3EE'})`,
                }}
                aria-hidden
              />
            </div>
          </Panel>

          <Panel title="Experience" description="Motion features can be switched off per site.">
            <div className="space-y-3">
              <Switch
                checked={draft.theme?.intro ?? true}
                onChange={(value) => set('theme', { ...draft.theme, intro: value })}
                label="Particle intro"
                description="The animated wordmark shown on the first visit of each session."
              />
              <Switch
                checked={draft.theme?.cursor ?? true}
                onChange={(value) => set('theme', { ...draft.theme, cursor: value })}
                label="Custom cursor"
                description="Replaces the pointer on devices with a fine pointer."
              />
              <Switch
                checked={draft.theme?.grain ?? true}
                onChange={(value) => set('theme', { ...draft.theme, grain: value })}
                label="Film grain"
                description="Subtle animated noise across the whole page."
              />
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-white/35">
              All three are bypassed automatically for visitors whose system requests reduced motion.
            </p>
          </Panel>
        </div>
      ) : null}

      {tab === 'account' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Your account">
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between border-b border-white/6 pb-2.5">
                <dt className="text-white/40">Name</dt>
                <dd className="text-white">{user?.name}</dd>
              </div>
              <div className="flex justify-between border-b border-white/6 pb-2.5">
                <dt className="text-white/40">Email</dt>
                <dd className="text-white">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Role</dt>
                <dd className="text-white">{user?.role}</dd>
              </div>
            </dl>

            <Button className="mt-6 w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </Panel>

          <Panel title="Change password" description="Signing in again is required on every other device.">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                passwordMutation.mutate();
              }}
            >
              <Field label="Current password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current}
                  onChange={(event) => setPasswords((p) => ({ ...p, current: event.target.value }))}
                  required
                />
              </Field>
              <Field label="New password" hint="10+ chars, mixed case and a number">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwords.next}
                  onChange={(event) => setPasswords((p) => ({ ...p, next: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={(event) => setPasswords((p) => ({ ...p, confirm: event.target.value }))}
                  required
                />
              </Field>
              <Button type="submit" variant="primary" loading={passwordMutation.isPending} className="w-full">
                Update password
              </Button>
            </form>
          </Panel>
        </div>
      ) : null}

      {tab === 'backup' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Export" description="A JSON archive of every content row. Binary assets stay with the storage driver.">
            <Button icon={<Download size={15} />} onClick={() => void exportBackup()}>
              Download backup
            </Button>
          </Panel>

          <Panel title="Import" description="Restores content from an archive. Existing rows are kept; duplicates are skipped.">
            <label className="block">
              <span className="sr-only">Choose a backup file</span>
              <input
                type="file"
                accept="application/json"
                disabled={!can('ADMIN')}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
                    setConfirmRestore(parsed);
                  } catch {
                    toast.error('That file is not valid JSON');
                  }
                }}
                className="block w-full text-[13px] text-white/50 file:mr-4 file:rounded-lg file:border-0 file:bg-white/[0.07] file:px-4 file:py-2 file:text-[13px] file:text-white hover:file:bg-white/[0.12]"
              />
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/30">
              <Upload size={13} /> Administrators only.
            </p>
          </Panel>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmRestore)}
        title="Import this backup?"
        description="Rows that already exist are skipped. Review the archive before importing into a live site."
        confirmLabel="Import content"
        loading={restoreMutation.isPending}
        onConfirm={() => confirmRestore && restoreMutation.mutate(confirmRestore)}
        onCancel={() => setConfirmRestore(null)}
      />
    </>
  );
}
