'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Award,
  BarChart3,
  Boxes,
  Folder,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  Settings,
  Sparkles,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuth } from './AuthProvider';
import { Button } from './ui';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: Boxes },
      { label: 'Media library', href: '/admin/media', icon: ImageIcon },
      { label: 'Categories', href: '/admin/collections/categories', icon: Folder },
      { label: 'Tags', href: '/admin/collections/tags', icon: Tags },
      { label: 'Services', href: '/admin/collections/services', icon: Sparkles },
      { label: 'Testimonials', href: '/admin/collections/testimonials', icon: MessageSquareQuote },
      { label: 'Clients', href: '/admin/collections/clients', icon: Users },
      { label: 'Awards', href: '/admin/collections/awards', icon: Award },
    ],
  },
  {
    title: 'Studio',
    items: [
      { label: 'Messages', href: '/admin/messages', icon: Mail },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Team', href: '/admin/users', icon: Users, adminOnly: true },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, can } = useAdminAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ultraviolet to-signal text-[13px] font-bold text-void">
            S
          </span>
          <span className="text-sm font-medium tracking-tight text-white">Studio</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/40 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || can('ADMIN'));
          if (!items.length) return null;

          return (
            <div key={group.title}>
              <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-300',
                          active
                            ? 'bg-white/[0.07] text-white'
                            : 'text-white/50 hover:bg-white/[0.04] hover:text-white/85',
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gradient-to-b from-ultraviolet to-signal" />
                        ) : null}
                        <Icon size={16} strokeWidth={1.7} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/6 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-xs font-medium text-white/70">
            {user?.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('') ?? '—'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-white">{user?.name}</span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
              {user?.role}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            className="text-white/35 transition-colors hover:text-red-400"
          >
            <LogOut size={16} />
          </button>
        </div>

        <Link
          href="/"
          target="_blank"
          className="mt-1 block rounded-xl px-3 py-2 text-[12px] text-white/35 transition-colors hover:text-white"
        >
          View live site ↗
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-void">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-white/6 bg-graphite-400/40 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-white/8 bg-graphite-300">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/6 bg-void/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            icon={<Menu size={18} />}
          />
          <span className="text-sm font-medium text-white">Studio</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[13px] text-white/40">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
