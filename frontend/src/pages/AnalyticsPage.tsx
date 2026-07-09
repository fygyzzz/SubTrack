import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { FileDown, FileText, Mail } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import { dashboardApi, exportApi, notificationApi } from '../api/client'
import type { DashboardData } from '../types'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6b7280']

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailOk, setEmailOk] = useState(true)

  useEffect(() => {
    dashboardApi.get().then(setData).finally(() => setLoading(false))
  }, [])

  const testEmail = async () => {
    setEmailMsg('')
    try {
      const res = await notificationApi.testEmail()
      setEmailMsg(res.message || 'Письмо отправлено')
      setEmailOk(true)
    } catch (err: any) {
      setEmailMsg(err?.response?.data?.error || 'Ошибка отправки')
      setEmailOk(false)
    }
    setTimeout(() => setEmailMsg(''), 3000)
  }

  if (loading) return <div className="text-center text-gray-500 py-20">Загрузка...</div>
  if (!data) return <div className="text-center text-gray-500 py-20">Ошибка загрузки</div>

  const chartData = Object.entries(data.categoryBreakdown).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }))

  const formatRub = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-800">Аналитика</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/40 border border-white/30 text-gray-800 text-sm outline-none focus:ring-2 focus:ring-white/50"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/40 border border-white/30 text-gray-800 text-sm outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            onClick={() => exportApi.csv(startDate || undefined, endDate || undefined)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/30 text-gray-700 text-sm font-medium hover:bg-white/40 transition-all cursor-pointer border-none"
          >
            <FileDown size={18} />
            CSV
          </button>
          <button
            onClick={() => exportApi.pdf(startDate || undefined, endDate || undefined)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/30 text-gray-700 text-sm font-medium hover:bg-white/40 transition-all cursor-pointer border-none"
          >
            <FileText size={18} />
            PDF
          </button>
          <button
            onClick={testEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/30 text-gray-700 text-sm font-medium hover:bg-white/40 transition-all cursor-pointer border-none"
          >
            <Mail size={18} />
            Тест email
          </button>
        </div>
      </div>
      {emailMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${emailOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {emailMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Распределение расходов</h2>
          {chartData.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет данных</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                    formatter={(value: number) => formatRub(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Итого</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/30">
              <p className="text-sm text-gray-500">В месяц</p>
              <p className="text-3xl font-semibold text-gray-800">{formatRub(data.monthlyTotal)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/30">
              <p className="text-sm text-gray-500">В год</p>
              <p className="text-3xl font-semibold text-gray-800">{formatRub(data.yearlyTotal)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-lg font-medium text-gray-800 mb-4">По категориям</h2>
        <div className="flex flex-col gap-2">
          {chartData
            .sort((a, b) => b.value - a.value)
            .map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/30">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-gray-800">{item.name}</span>
                <span className="font-semibold text-gray-800">{formatRub(item.value)}</span>
              </div>
            ))}
        </div>
      </GlassCard>
    </div>
  )
}
