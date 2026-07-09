import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/client'
import { loginSchema } from '../validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError('')

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const { token, user } = await authApi.login(email, password)
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      window.location.href = '/'
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Неверный email или пароль'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass w-full max-w-sm p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <DollarSign size={28} className="text-gray-800" />
          <span className="text-2xl font-semibold text-gray-800">SubTrack</span>
        </div>
        <h1 className="text-xl font-medium text-gray-800 mb-6 text-center">Вход</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors({}) }}
              className={`w-full px-4 py-3 rounded-xl bg-white/40 border text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all ${
                errors.email ? 'border-red-300' : 'border-white/30'
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}) }}
                className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/40 border text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all ${
                  errors.password ? 'border-red-300' : 'border-white/30'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none p-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all cursor-pointer border-none disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-gray-800 font-medium no-underline hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
