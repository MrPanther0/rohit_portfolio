'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ease } from '@/lib/motion';
import { SplitText } from '@/components/ui/SplitText';

interface SectionHeadingProps {
  index?: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        'relative flex flex-col gap-5',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, ease: ease.expo }}
      >
        {index ? <span className="font-mono text-xs text-ultraviolet">{index}</span> : null}
        <span className="eyebrow">{eyebrow}</span>
        <motion.span
          className="h-px bg-gradient-to-r from-white/40 to-transparent"
          initial={{ width: 0 }}
          whileInView={{ width: 72 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.1, ease: ease.expo, delay: 0.15 }}
        />
      </motion.div>

      <SplitText
        as="h2"
        mode="words"
        className="display max-w-[18ch] text-fluid-2xl text-white"
        stagger={0.05}
      >
        {title}
      </SplitText>

      {description ? (
        <motion.p
          className={cn('max-w-xl text-fluid-base leading-relaxed text-white/50', align === 'center' && 'mx-auto')}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: ease.expo, delay: 0.2 }}
        >
          {description}
        </motion.p>
      ) : null}
    </header>
  );
}
