import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Введите пароль'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(100),
  email: z.string().email('Неверный формат email'),
  password: z
    .string()
    .min(6, 'Минимум 6 символов')
    .regex(/[a-zA-Zа-яА-Я]/, 'Нужна хотя бы одна буква')
    .regex(/[0-9]/, 'Нужна хотя бы одна цифра'),
})

export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  amount: z.number({ invalid_type_error: 'Введите число' }).positive('Сумма должна быть больше 0'),
  currency: z.enum(['RUB', 'USD', 'EUR']),
  period: z.enum(['monthly', 'yearly']),
  next_payment_date: z.string().min(1, 'Дата списания обязательна'),
  category_id: z.number({ invalid_type_error: 'Выберите категорию' }).int().positive('Категория обязательна'),
})

export type LoginData = z.infer<typeof loginSchema>
export type RegisterData = z.infer<typeof registerSchema>
export type SubscriptionData = z.infer<typeof subscriptionSchema>
