import { useEffect, useState } from 'react'
import { Wallet, TrendingUp, Calendar, AlertCircle, DollarSign, Euro } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import { dashboardApi } from '../api/client'
import type { DashboardData } from '../types'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifBanner, setNotifBanner] = useState(
    'Notification' in window && Notification.permission === 'default'
  )

  useEffect(() => {
    dashboardApi.get().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-500 py-20">Загрузка...</div>
  if (!data) return <div className="text-center text-gray-500 py-20">Ошибка загрузки</div>

  const enableNotifications = async () => {
    const result = await Notification.requestPermission()
    if (result === 'granted') setNotifBanner(false)
  }

  const formatRub = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

  const cards = [
    { label: 'В месяц', value: formatRub(data.monthlyTotal), icon: Wallet, color: 'text-emerald-600' },
    { label: 'В год', value: formatRub(data.yearlyTotal), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Подписок', value: data.totalSubscriptions.toString(), icon: AlertCircle, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Дашборд</h1>

      {notifBanner && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">Включите уведомления, чтобы не пропустить списания</p>
            <button
              onClick={enableNotifications}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer border-none"
            >
              Включить
            </button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <GlassCard key={card.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-800 mt-1">{card.value}</p>
                </div>
                <Icon size={24} className={card.color} />
              </div>
            </GlassCard>
          )
        })}
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-gray-500" />
          <h2 className="text-lg font-medium text-gray-800">Ближайшие списания</h2>
        </div>
        {data.upcomingPayments.length === 0 ? (
          <p className="text-gray-400 text-sm">Нет ближайших списаний</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.upcomingPayments.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl ${p.overdue ? 'bg-red-50/30' : 'bg-white/30'}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${p.overdue ? 'text-rose-600' : 'text-gray-800'}`}>{p.name}</p>
                    {p.overdue && (
                      <span className="text-xs text-rose-500 font-medium">
                        Просрочено
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${p.overdue ? 'text-rose-400' : 'text-gray-400'}`}>{new Date(p.next_payment_date).toLocaleDateString('ru-RU')}</p>
                </div>
                <p className={`font-semibold ${p.overdue ? 'text-rose-600' : 'text-gray-800'}`}>
                  {formatRub(p.rub_amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0 && (
        <GlassCard>
          <h2 className="text-lg font-medium text-gray-800 mb-4">По категориям</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.categoryBreakdown).map(([cat, amount]) => (
              <div key={cat} className="p-3 rounded-xl bg-white/30">
                <p className="text-sm text-gray-500">{cat}</p>
                <p className="text-lg font-semibold text-gray-800">{formatRub(amount)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {data.exchangeRates?.USD && data.exchangeRates?.EUR && (
        <GlassCard>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Курс валют (ЦБ РФ)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/30 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">USD / RUB</p>
                <p className="text-xl font-semibold text-gray-800">1 $ = {data.exchangeRates.USD} ₽</p>
              </div>
              <DollarSign size={28} className="text-emerald-600" />
            </div>
            <div className="p-4 rounded-xl bg-white/30 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">EUR / RUB</p>
                <p className="text-xl font-semibold text-gray-800">1 € = {data.exchangeRates.EUR} ₽</p>
              </div>
              <Euro size={28} className="text-blue-600" />
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
