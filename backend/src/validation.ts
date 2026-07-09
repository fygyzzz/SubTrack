import { z } from 'zod';
import type { FastifyReply } from 'fastify';

export const registerSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z
    .string()
    .min(6, 'Минимум 6 символов')
    .regex(/[a-zA-Zа-яА-Я]/, 'Пароль должен содержать хотя бы одну букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(255),
  amount: z.number().positive('Сумма должна быть больше 0'),
  currency: z.enum(['RUB', 'USD', 'EUR']).default('RUB'),
  period: z.enum(['monthly', 'yearly']).default('monthly'),
  next_payment_date: z.string().min(1, 'Дата списания обязательна'),
  category_id: z.number().int().positive('Категория обязательна'),
});

export const updateSubscriptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(['RUB', 'USD', 'EUR']).optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  next_payment_date: z.string().min(1).optional(),
  category_id: z.number().int().positive().nullable().optional(),
  review_flag: z.boolean().optional(),
});

export function validate(schema: z.ZodSchema, data: unknown, reply: FastifyReply): any {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'root';
      if (!errors[field]) errors[field] = issue.message;
    }
    reply.status(400).send({ error: 'Validation failed', details: errors });
    return null;
  }
  return result.data;
}
