'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const assessmentId = localStorage.getItem('assessmentId')
    const res = await fetch('/api/auth/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, assessmentId }),
    })
    const data = await res.json()
    if (data.sessionToken) {
      localStorage.setItem('sessionToken', data.sessionToken)
      router.push('/result')
    }
    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>绑定邮箱</h2>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>绑定邮箱后，换设备也能找回你的健康计划</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="输入你的邮箱"
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16 }}
        />
        <button type="submit" disabled={loading}
          style={{ padding: '14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
          {loading ? '处理中...' : '确认并查看结果'}
        </button>
      </form>
    </main>
  )
}
