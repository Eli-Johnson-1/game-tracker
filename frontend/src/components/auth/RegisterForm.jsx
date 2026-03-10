import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../common/Button'
import { ErrorMessage } from '../common/ErrorMessage'

export function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorMessage message={error} />
      <div>
        <label className="block text-sm text-gray-300 mb-1">Username</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={30}
          autoFocus
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1">Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
        />
        <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-400 hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
