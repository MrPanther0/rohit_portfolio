'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from '@/components/admin/AuthProvider';
import { AdminShell } from '@/components/admin/AdminShell';
import { Spinner } from '@/components/admin/ui';

function Guard({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (status === 'anonymous' && !isLogin) router.replace('/admin/login');
    if (status === 'authenticated' && isLogin) router.replace('/admin');
  }, [status, isLogin, router]);

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-void">
        <Spinner label="Restoring session" />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;
  if (status !== 'authenticated') return null;

  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  // One client per browser session; admin data is short-lived and refetched on focus.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Guard>{children}</Guard>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
