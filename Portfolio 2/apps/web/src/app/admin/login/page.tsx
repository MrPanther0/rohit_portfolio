'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/AuthProvider';
import { Button, Field, Input } from '@/components/admin/ui';
import { ease } from '@/lib/motion';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password, remember);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-void px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(139,92,246,0.16), transparent 62%), radial-gradient(ellipse 45% 40% at 20% 90%, rgba(34,211,238,0.1), transparent 65%)',
        }}
      />

      <motion.div
        className="relative w-full max-w-[420px]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: ease.expo }}
      >
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-ultraviolet to-signal text-lg font-bold text-void">
            S
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-white">Studio access</h1>
          <p className="mt-1.5 text-[13px] text-white/40">Sign in to manage the portfolio.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-xl"
        >
          <Field label="Email">
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@studio.dev"
                autoComplete="username"
                required
                className="pl-10"
              />
            </div>
          </Field>

          <Field label="Password">
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="pl-10"
              />
            </div>
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-white/55">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#8B5CF6]"
            />
            Keep me signed in on this device
          </label>

          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300"
              role="alert"
            >
              {error}
            </motion.p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/20">
          Protected area · sessions expire automatically
        </p>
      </motion.div>
    </div>
  );
}
