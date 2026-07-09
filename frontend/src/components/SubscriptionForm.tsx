import { useState } from 'react'
import { subscriptionApi } from '../api/client'
import { subscriptionSchema } from '../validation'
import type { Subscription, Category } from '../types'

interface Props {
  categories: Category[]
  initial: Subscription | null
  onSave: () => void
  onCancel: () => void
}

export default function SubscriptionForm({ categories, initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name || '')
  const [amount, setAmount] = useState(initial?.amount.toString() || '')
  const [currency, setCurrency] = useState(initial?.currency || 'RUB')
  const [period, setPeriod] = useState<'monthly' | 'yearly'>(initial?.period || 'monthly')
  const [nextDate, setNextDate] = useState(initial?.next_payment_date || '')
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id || null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError('')

    const result = subscriptionSchema.safeParse({
      name,
      amount: amount === '' ? undefined : Number(amount),
      currency,
      period,
      next_payment_date: nextDate,
      category_id: categoryId,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    const data = {
      name: result.data.name,
      amount: result.data.amount,
      currency: result.data.currency,
      period: result.data.period,
      next_payment_date: result.data.next_payment_date,
      category_id: result.data.category_id,
    }

    try {
      if (initial) {
        await subscriptionApi.update(initial.id, data)
      } else {
        await subscriptionApi.create(data)
      }
      onSave()
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Ошибка сохранения'
      setServerError(msg)
    }
  }

  const fieldClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl bg-white/40 border text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all ${
      errors[field] ? 'border-red-300' : 'border-white/30'
    }`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Название *"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}) }}
            className={fieldClass('name')}
            required
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <input
            type="number"
            step="0.01"
            placeholder="Сумма *"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setErrors({}) }}
            className={fieldClass('amount')}
            required
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={fieldClass('currency')}
        >
          <option value="RUB">RUB</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
          className={fieldClass('period')}
        >
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </select>
        <div>
          <input
            type="date"
            placeholder="Дата списания *"
            value={nextDate}
            onChange={(e) => { setNextDate(e.target.value); setErrors({}) }}
            className={fieldClass('next_payment_date')}
            required
          />
          {errors.next_payment_date && <p className="text-red-500 text-xs mt-1">{errors.next_payment_date}</p>}
        </div>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className={fieldClass('category_id')}
        >
          <option value="">Выберите категорию</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
      </div>
      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all cursor-pointer border-none"
        >
          {initial ? 'Сохранить' : 'Добавить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl bg-white/30 text-gray-600 font-medium hover:bg-white/40 transition-all cursor-pointer border-none"
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
