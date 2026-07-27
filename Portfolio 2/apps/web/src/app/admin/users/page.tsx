'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { PageHeader } from '@/components/admin/AdminShell';
import { Badge, Button, Field, Input, Select, Spinner } from '@/components/admin/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { AdminUser, Role } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const ROLE_HINT: Record<Role, string> = {
  ADMIN: 'Full control, including deletions, team and backups.',
  EDITOR: 'Create and edit content. Cannot delete or manage the team.',
  VIEWER: 'Read-only access to the dashboard.',
};

export default function AdminUsersPage() {
  const { request, user: currentUser } = useAdminAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EDITOR' as Role });
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await request<AdminUser[]>('/api/admin/users')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const createMutation = useMutation({
    mutationFn: async () => request('/api/admin/users', { method: 'POST', body: form }),
    onSuccess: () => {
      toast.success('Team member added');
      setOpen(false);
      setForm({ name: '', email: '', password: '', role: 'EDITOR' });
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminUser> }) =>
      request(`/api/admin/users/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      toast.success('Team member updated');
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Team member removed');
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in to the studio dashboard, and what they are allowed to do."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            Add member
          </Button>
        }
      />

      {query.isLoading ? (
        <Spinner label="Loading team" />
      ) : (
        <ul className="space-y-2">
          {query.data?.map((member) => {
            const isSelf = member.id === currentUser?.id;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.015] p-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-xs font-medium text-white/70">
                  {member.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[13px] font-medium text-white">
                    {member.name}
                    {isSelf ? <Badge>you</Badge> : null}
                    {!member.active ? <Badge tone="danger">disabled</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-white/35">
                    {member.email} · last signed in {formatDate(member.lastLoginAt, true)}
                  </p>
                </div>

                <Select
                  value={member.role}
                  disabled={isSelf}
                  onChange={(event) =>
                    updateMutation.mutate({ id: member.id, patch: { role: event.target.value as Role } })
                  }
                  className="h-9 w-auto min-w-[120px] py-0 text-xs"
                  aria-label={`Role for ${member.name}`}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </Select>

                <Button
                  size="sm"
                  disabled={isSelf}
                  onClick={() => updateMutation.mutate({ id: member.id, patch: { active: !member.active } })}
                >
                  {member.active ? 'Disable' : 'Enable'}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isSelf}
                  aria-label={`Remove ${member.name}`}
                  icon={<Trash2 size={14} />}
                  onClick={() => setPendingDelete(member)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_HINT) as Role[]).map((role) => (
          <div key={role} className="rounded-xl border border-white/8 bg-white/[0.015] p-4">
            <Badge tone={role === 'ADMIN' ? 'accent' : 'neutral'}>{role}</Badge>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/45">{ROLE_HINT[role]}</p>
          </div>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[130] grid place-items-center px-5">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <form
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-graphite-300 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <header className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Add a team member</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-white/40 hover:text-white"
              >
                <X size={17} />
              </button>
            </header>

            <div className="space-y-4">
              <Field label="Name" required>
                <Input
                  value={form.name}
                  required
                  onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  required
                  onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                />
              </Field>
              <Field label="Temporary password" hint="10+ chars, mixed case and a number" required>
                <Input
                  type="text"
                  value={form.password}
                  required
                  onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
                />
              </Field>
              <Field label="Role">
                <Select
                  value={form.role}
                  onChange={(event) => setForm((f) => ({ ...f, role: event.target.value as Role }))}
                >
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </Select>
              </Field>
              <p className="text-[12px] text-white/35">{ROLE_HINT[form.role]}</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={createMutation.isPending}>
                Add member
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Remove ${pendingDelete?.name}?`}
        description="They lose access immediately and every active session is revoked."
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
