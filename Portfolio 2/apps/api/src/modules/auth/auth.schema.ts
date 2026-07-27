import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200)
  .refine((v) => /[a-z]/.test(v), 'Include a lowercase letter')
  .refine((v) => /[A-Z]/.test(v), 'Include an uppercase letter')
  .refine((v) => /[0-9]/.test(v), 'Include a number');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  avatarUrl: z.string().url().nullish(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
