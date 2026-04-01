'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else if (data.user && data.session) {
        // User is confirmed and has a session — create profile and proceed
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
        })
        router.push('/onboarding')
      } else if (data.user && !data.session) {
        // User created but no session — email confirmation is still enabled in Supabase
        setMessage('Account created! Check your email to confirm, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">RUNCOACH</h1>
        <p className="login-subtitle">AI-powered running training</p>

        <div className="login-field">
          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            minLength={6}
            required
          />
        </div>

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Loading...' : isSignUp ? 'SIGN UP' : 'SIGN IN'}
        </button>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="login-message" style={{ color: '#4ade80', fontSize: '0.875rem', marginTop: '0.5rem' }}>{message}</p>}

        <div className="login-toggle">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  )
}
