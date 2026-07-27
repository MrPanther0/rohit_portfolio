'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, Send } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useCursor } from '@/components/experience/CursorProvider';
import { trackEvent } from '@/components/experience/Analytics';
import { usePrefersReducedMotion } from '@/hooks/useEnvironment';

const BUDGETS = ['Under £5k', '£5k – £15k', '£15k – £40k', '£40k+', 'Not sure yet'];

const schema = z.object({
  name: z.string().min(2, 'Tell me your name').max(80),
  email: z.string().email('That email does not look right'),
  subject: z.string().max(140).optional(),
  budget: z.string().max(60).optional(),
  message: z.string().min(10, 'A little more detail, please').max(5000),
  /** Honeypot — hidden from humans, irresistible to bots. */
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/** Field with a rule that draws itself on focus. */
function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('group relative block', className)}>
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </span>
      {children}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-ultraviolet to-signal transition-transform duration-700 ease-expo group-focus-within:scale-x-100"
      />
      <AnimatePresence>
        {error ? (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 block text-xs text-ember"
            role="alert"
          >
            {error}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </label>
  );
}

const inputStyles =
  'w-full border-b border-white/12 bg-transparent pb-3 text-fluid-base text-white outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/30';

export function Contact({ settings }: { settings: SiteSettings }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const cursor = useCursor();
  const reduced = usePrefersReducedMotion();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', subject: '', budget: '', message: '', website: '' },
  });

  const budget = watch('budget');

  // Return to the idle form a few seconds after a successful send.
  useEffect(() => {
    if (status !== 'sent') return;
    const id = window.setTimeout(() => setStatus('idle'), 6000);
    return () => window.clearTimeout(id);
  }, [status]);

  const onSubmit = async (values: FormValues) => {
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? 'Message could not be delivered');
      }

      trackEvent('contact_submitted', values.budget || 'unspecified');
      reset();
      setStatus('sent');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative overflow-hidden bg-void py-24 md:py-32"
      aria-label="Contact"
      onPointerMove={(event) => {
        if (reduced) return;
        const bounds = sectionRef.current?.getBoundingClientRect();
        if (!bounds) return;
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width) * 100,
          y: ((event.clientY - bounds.top) / bounds.height) * 100,
        });
      }}
    >
      {/* The room changes: a soft light that follows the visitor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
        style={{
          background: `radial-gradient(720px circle at ${pointer.x}% ${pointer.y}%, rgba(139,92,246,0.13), transparent 60%),
                       radial-gradient(900px circle at ${100 - pointer.x}% ${100 - pointer.y}%, rgba(34,211,238,0.08), transparent 62%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000, transparent 75%)',
        }}
      />

      <div className="container relative">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <div>
            <SectionHeading
              index="07"
              eyebrow="Contact"
              title="Let's make something worth remembering"
              description={settings.tagline}
            />

            <dl className="mt-12 space-y-8">
              <div>
                <dt className="eyebrow mb-2">Email</dt>
                <dd>
                  <a
                    href={`mailto:${settings.email}`}
                    className="group inline-flex items-center gap-2 text-fluid-lg text-white transition-colors hover:text-signal"
                    onClick={() => trackEvent('email_click', settings.email)}
                    {...cursor.bind('link', 'write')}
                  >
                    {settings.email}
                    <ArrowUpRight
                      size={18}
                      className="transition-transform duration-500 ease-expo group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </a>
                </dd>
              </div>

              {settings.phone ? (
                <div>
                  <dt className="eyebrow mb-2">Phone</dt>
                  <dd className="text-fluid-base text-white/70">{settings.phone}</dd>
                </div>
              ) : null}

              <div>
                <dt className="eyebrow mb-2">Studio</dt>
                <dd className="text-fluid-base text-white/70">{settings.location}</dd>
              </div>

              <div>
                <dt className="eyebrow mb-3">Elsewhere</dt>
                <dd className="flex flex-wrap gap-2">
                  {settings.socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('social_click', social.label)}
                      className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/60 transition-all duration-500 ease-expo hover:border-white/35 hover:text-white"
                      {...cursor.bind('link', 'open')}
                    >
                      {social.label}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="glass relative overflow-hidden rounded-[32px] p-7 md:p-10">
            <AnimatePresence mode="wait">
              {status === 'sent' ? (
                <motion.div
                  key="sent"
                  className="flex min-h-[420px] flex-col items-center justify-center text-center"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.6, ease: ease.expo }}
                >
                  {/* Paper plane leaves the frame, then the confirmation lands. */}
                  <motion.div
                    className="relative mb-8 text-white"
                    initial={{ x: -60, y: 20, opacity: 0, rotate: -20 }}
                    animate={{ x: [-60, 0, 140], y: [20, 0, -90], opacity: [0, 1, 0], rotate: [-20, 0, 25] }}
                    transition={{ duration: 1.5, ease: ease.expo, times: [0, 0.45, 1] }}
                  >
                    <Send size={40} strokeWidth={1.3} />
                  </motion.div>

                  <motion.span
                    className="grid h-16 w-16 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1.1, type: 'spring', stiffness: 220, damping: 16 }}
                  >
                    <Check size={26} />
                  </motion.span>

                  <motion.h3
                    className="display mt-7 text-fluid-xl text-white"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.25, duration: 0.7, ease: ease.expo }}
                  >
                    Message sent
                  </motion.h3>
                  <motion.p
                    className="mt-3 max-w-sm text-sm leading-relaxed text-white/55"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.45, duration: 0.7 }}
                  >
                    Thank you — I read every enquiry myself and reply within two working days.
                  </motion.p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-7"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid gap-7 sm:grid-cols-2">
                    <Field label="Your name" error={errors.name?.message}>
                      <input
                        {...register('name')}
                        type="text"
                        autoComplete="name"
                        placeholder="Ada Lovelace"
                        className={inputStyles}
                        aria-invalid={Boolean(errors.name)}
                      />
                    </Field>

                    <Field label="Email" error={errors.email?.message}>
                      <input
                        {...register('email')}
                        type="email"
                        autoComplete="email"
                        placeholder="you@studio.com"
                        className={inputStyles}
                        aria-invalid={Boolean(errors.email)}
                      />
                    </Field>
                  </div>

                  <Field label="What is it about?" error={errors.subject?.message}>
                    <input
                      {...register('subject')}
                      type="text"
                      placeholder="Brand identity for a new studio"
                      className={inputStyles}
                    />
                  </Field>

                  <fieldset>
                    <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                      Budget range
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {BUDGETS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setValue('budget', budget === option ? '' : option)}
                          aria-pressed={budget === option}
                          className={cn(
                            'rounded-full border px-4 py-2 text-[13px] transition-all duration-500 ease-expo',
                            budget === option
                              ? 'border-transparent bg-white text-void'
                              : 'border-white/12 text-white/55 hover:border-white/30 hover:text-white',
                          )}
                          {...cursor.bind('link')}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" {...register('budget')} />
                  </fieldset>

                  <Field label="Tell me about the project" error={errors.message?.message}>
                    <textarea
                      {...register('message')}
                      rows={5}
                      placeholder="What is the question at the centre of it?"
                      className={cn(inputStyles, 'resize-none')}
                      aria-invalid={Boolean(errors.message)}
                    />
                  </Field>

                  {/* Honeypot */}
                  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label htmlFor="website">Leave this field empty</label>
                    <input id="website" tabIndex={-1} autoComplete="off" {...register('website')} />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <MagneticButton
                      type="submit"
                      size="lg"
                      disabled={status === 'sending'}
                      icon={<Send size={16} />}
                      cursorLabel="send"
                    >
                      {status === 'sending' ? 'Sending…' : 'Send message'}
                    </MagneticButton>

                    <AnimatePresence>
                      {status === 'error' ? (
                        <motion.p
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-sm text-ember"
                          role="alert"
                        >
                          {errorMessage}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
