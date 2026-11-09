import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MannLogo from '../components/MannLogo'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const err = await login(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard')
  }

  const fillDemo = () => {
    setEmail('admin@user.com')
    setPassword('password@123')
  }

  return (
    <div className="auth-root">
      {/* Left panel */}
      <div className="auth-panel">
        <div className="auth-panel-logo">
          <MannLogo size={36} showText={true} textColor="#fff" />
        </div>
        <div className="auth-panel-quote">
          <blockquote>
            "The future of work is not about replacing humans — it's about amplifying what makes us irreplaceable."
          </blockquote>
          <cite>Mann AI Platform</cite>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.5"/>
                <path d="M7 4v3M7 9.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email" id="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@user.com" autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password" id="password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
              />
            </div>
            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{animation:'spin 0.8s linear infinite'}}>
                    <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none"/>
                    <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider">or</div>

          <button onClick={fillDemo} className="auth-btn auth-btn-ghost" type="button">
            Use demo credentials
          </button>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
