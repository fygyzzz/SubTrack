import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import SubscriptionForm from '../components/SubscriptionForm'
import { subscriptionApi, categoryApi } from '../api/client'
import type { Subscription, Category } from '../types'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSub, setEditSub] = useState<Subscription | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      subscriptionApi.list(),
      categoryApi.list(),
    ]).then(([s, c]) => {
      setSubs(s)
      setCategories(c)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить подписку?')) return
    await subscriptionApi.delete(id)
    load()
  }

  const handleToggleReview = async (id: number) => {
    await subscriptionApi.toggleReview(id)
    load()
  }

  const handleSave = () => {
    setShowForm(false)
    setEditSub(null)
    load()
  }

  if (loading) return <div className="text-center text-gray-500 py-20">Загрузка...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Подписки</h1>
        <button
          onClick={() => { setEditSub(null); setShowForm(!showForm) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer border-none"
        >
          <Plus size={18} />
          Добавить
        </button>
      </div>

      {showForm && (
        <GlassCard>
          <h2 className="text-lg font-medium text-gray-800 mb-4">
            {editSub ? 'Редактировать' : 'Новая подписка'}
          </h2>
          <SubscriptionForm
            categories={categories}
            initial={editSub}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditSub(null) }}
          />
        </GlassCard>
      )}

      <div className="flex flex-col gap-3">
        {subs.length === 0 && (
          <GlassCard>
            <p className="text-gray-400 text-center">Нет подписок. Добавьте первую!</p>
          </GlassCard>
        )}
        {subs.map((sub) => (
          <GlassCard key={sub.id}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{sub.name}</p>
                  {sub.review_flag && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Пересмотреть
                    </span>
                  )}
                  {(sub as any).suggested_review && !sub.review_flag && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      Рекомендуем пересмотреть
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {sub.category_name || 'Без категории'} · {sub.period === 'monthly' ? 'ежемесячно' : 'ежегодно'} · списание {new Date(sub.next_payment_date).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-gray-800">
                  {Number(sub.amount).toFixed(2)} {sub.currency}
                </p>
                <button
                  onClick={() => handleToggleReview(sub.id)}
                  className="p-2 rounded-xl hover:bg-white/40 transition-all cursor-pointer bg-transparent border-none text-gray-400 hover:text-amber-600"
                  title={sub.review_flag ? 'Убрать отметку' : 'Отметить "пересмотреть"'}
                >
                  {sub.review_flag ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  onClick={() => { setEditSub(sub); setShowForm(true) }}
                  className="p-2 rounded-xl hover:bg-white/40 transition-all cursor-pointer bg-transparent border-none text-gray-400 hover:text-blue-600"
                  title="Редактировать"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  className="p-2 rounded-xl hover:bg-white/40 transition-all cursor-pointer bg-transparent border-none text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
