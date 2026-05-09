'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12,
}

type HistoryRecord = {
  id: string; bmi: number; targetCalories: number
  targetDate: string | null; createdAt: string
}

export default function AccountPage() {
  const router = useRouter()
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay' | null>(null)

  const getToken = () => localStorage.getItem('sessionToken')

  const fetchResult = async () => {
    const token = getToken()
    const id = localStorage.getItem('recordId')
    if (!token || !id) { router.push('/'); return }
    const [res, histRes] = await Promise.all([
      fetch(`/api/records/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/records', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (res.ok) setResult(await res.json())
    else { router.push('/'); return }
    if (histRes.ok) setHistory(await histRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchResult() }, [])

  const handlePay = async (method: 'wechat' | 'alipay') => {
    setPaying(true)
    await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: getToken() }),
    })
    setShowModal(false)
    await fetchResult()
    setPaying(false)
  }

  if (loading) return (
    <main style={{ maxWidth: 960, margin: '80px auto', padding: '0 24px', fontFamily: '-apple-system,sans-serif', textAlign: 'center' }}>
      <p style={{ color: '#999' }}>正在加载你的健康方案...</p>
    </main>
  )

  const bmi = result?.bmi as number
  const bmiLabel = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '健康' : bmi < 28 ? '偏重' : '肥胖'
  const bmiColor = bmi < 18.5 ? '#f59e0b' : bmi < 24 ? '#10b981' : bmi < 28 ? '#f59e0b' : '#ef4444'
  const isPaid = !result?.preview
  const plan = result?.healthPlan as Record<string, string> | undefined

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 60px', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', background: '#f5f5f7', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#111' }}>健康评估结果</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* 左栏：当前结果 */}
        <div>
          {/* BMI */}
          <div style={card}>
            <p style={{ fontSize: 12, color: '#999', margin: '0 0 8px' }}>BMI 指数</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 44, fontWeight: 700, color: bmiColor, lineHeight: 1 }}>{bmi}</span>
              <span style={{ fontSize: 14, color: bmiColor, fontWeight: 500 }}>{bmiLabel}</span>
            </div>
            <BmiBar bmi={bmi} />
          </div>

          {/* 卡路里 + 达标日期 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={card}>
              <p style={{ fontSize: 12, color: '#999', margin: '0 0 6px' }}>每日建议摄入</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{result?.targetCalories as number}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>kcal / 天</p>
            </div>
            <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              <p style={{ fontSize: 12, color: '#999', margin: '0 0 6px' }}>预计达标日期</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, filter: isPaid ? 'none' : 'blur(5px)', userSelect: isPaid ? 'auto' : 'none' }}>
                {result?.targetDate ? new Date(result.targetDate as string).toLocaleDateString('zh-CN') : '已达目标'}
              </p>
              {!isPaid && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0070f3' }}>订阅后查看</span>}
            </div>
          </div>

          {/* 付费内容 */}
          {isPaid ? (
            <>
              <div style={card}>
                <p style={{ fontSize: 12, color: '#999', margin: '0 0 8px' }}>体重预测曲线</p>
                <WeightCurve current={result?.currentWeight as number} target={result?.targetWeight as number} targetDate={result?.targetDate as string} />
              </div>
              {plan && (
                <>
                  <p style={{ fontSize: 13, color: '#999', margin: '20px 0 10px', fontWeight: 500 }}>个性化健康计划</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { key: 'exercise', label: '运动建议', icon: '🏃', accent: '#0070f3' },
                      { key: 'diet',     label: '饮食建议', icon: '🥗', accent: '#10b981' },
                      { key: 'sleep',    label: '睡眠建议', icon: '😴', accent: '#8b5cf6' },
                    ].map(({ key, label, icon, accent }) => (
                      <div key={key} style={{ ...card, borderTop: `3px solid ${accent}` }}>
                        <p style={{ fontSize: 12, color: accent, margin: '0 0 8px' }}>{icon}  {label}</p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#555' }}>{plan[key]}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ filter: 'blur(5px)', pointerEvents: 'none', marginBottom: 16, opacity: 0.6 }}>
                <svg width="100%" height="50" viewBox="0 0 300 50">
                  <polyline points="0,45 60,34 120,24 180,15 240,8 300,3" fill="none" stroke="#0070f3" strokeWidth="2.5" />
                </svg>
                {['运动建议', '饮食建议', '睡眠建议'].map(t => (
                  <div key={t} style={{ background: '#f0f0f0', borderRadius: 10, padding: '12px 14px', marginBottom: 8, textAlign: 'left' }}>
                    <div style={{ width: 60, height: 8, background: '#ddd', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '90%', height: 7, background: '#e5e5e5', borderRadius: 4, marginBottom: 4 }} />
                    <div style={{ width: '70%', height: 7, background: '#e5e5e5', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>解锁完整体重曲线及个性化健康计划</p>
              <button onClick={() => setShowModal(true)}
                style={{ padding: '13px 36px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                立即解锁完整计划
              </button>
            </div>
          )}
        </div>

        {/* 右栏：历史记录 */}
        <div>
          <div style={{ ...card, padding: '16px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '0 0 14px' }}>历史测评记录</p>
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>暂无历史记录</p>
            ) : (
              history.map((r, i) => {
                const label = r.bmi < 18.5 ? '偏瘦' : r.bmi < 24 ? '健康' : r.bmi < 28 ? '偏重' : '肥胖'
                const color = r.bmi < 18.5 ? '#f59e0b' : r.bmi < 24 ? '#10b981' : r.bmi < 28 ? '#f59e0b' : '#ef4444'
                const isCurrent = i === 0
                return (
                  <div key={r.id} style={{ padding: '12px 0', borderBottom: i < history.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#bbb' }}>{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>
                      {isCurrent && <span style={{ fontSize: 11, background: '#e8f0fe', color: '#0070f3', borderRadius: 4, padding: '2px 6px' }}>最新</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>BMI</p>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color }}>{r.bmi} <span style={{ fontSize: 11, fontWeight: 400 }}>{label}</span></p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>建议摄入</p>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#333' }}>{r.targetCalories} <span style={{ fontSize: 11, fontWeight: 400, color: '#999' }}>kcal</span></p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* 支付弹窗 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>选择支付方式</h3>
              <button onClick={() => { setShowModal(false); setPayMethod(null) }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#bbb' }}>×</button>
            </div>
            <p style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>解锁完整健康计划 · ¥29.9</p>
            {(['wechat', 'alipay'] as const).map((m) => {
              const isWechat = m === 'wechat'
              const color = isWechat ? '#07c160' : '#1677ff'
              const selected = payMethod === m
              return (
                <div key={m} onClick={() => setPayMethod(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `2px solid ${selected ? color : '#eee'}`, borderRadius: 12, marginBottom: 10, cursor: 'pointer', background: selected ? (isWechat ? '#f0faf4' : '#f0f6ff') : '#fafafa' }}>
                  <span style={{ fontSize: 26 }}>{isWechat ? '💚' : '💙'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color, fontSize: 15 }}>{isWechat ? '微信支付' : '支付宝'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#bbb' }}>{isWechat ? 'WeChat Pay' : 'Alipay'}</p>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? color : '#ddd'}`, background: selected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                </div>
              )
            })}
            <button onClick={() => payMethod && handlePay(payMethod)} disabled={!payMethod || paying}
              style={{ width: '100%', padding: '14px', background: payMethod === 'wechat' ? '#07c160' : payMethod === 'alipay' ? '#1677ff' : '#e0e0e0', color: payMethod ? '#fff' : '#aaa', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: payMethod ? 'pointer' : 'not-allowed', marginTop: 4 }}>
              {paying ? '支付中...' : '确认支付 ¥29.9'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function BmiBar({ bmi }: { bmi: number }) {
  const min = 10, max = 40, W = 300, barY = 20, barH = 12
  const xOf = (v: number) => ((v - min) / (max - min)) * W
  const segments = [
    { label: '偏瘦', start: 10,   end: 18.5, color: '#60a5fa' },
    { label: '健康', start: 18.5, end: 24,   color: '#10b981' },
    { label: '偏重', start: 24,   end: 28,   color: '#f59e0b' },
    { label: '肥胖', start: 28,   end: 40,   color: '#ef4444' },
  ]
  const px = xOf(Math.min(Math.max(bmi, min), max))
  return (
    <svg width="100%" viewBox="0 0 300 60" style={{ overflow: 'visible' }}>
      {segments.map((s, i) => (
        <rect key={s.label} x={xOf(s.start)} y={barY} width={xOf(s.end) - xOf(s.start)} height={barH} fill={s.color} rx={i === 0 || i === segments.length - 1 ? 4 : 0} />
      ))}
      {[18.5, 24, 28].map(t => (
        <g key={t}>
          <line x1={xOf(t)} y1={barY} x2={xOf(t)} y2={barY + barH + 4} stroke="#fff" strokeWidth="1.5" />
          <text x={xOf(t)} y={barY + barH + 14} fontSize="9" fill="#bbb" textAnchor="middle">{t}</text>
        </g>
      ))}
      <rect x={px - 2} y={barY - 5} width={4} height={barH + 10} fill="#222" rx={2} />
      {segments.map(s => (
        <text key={s.label} x={xOf(s.start) + (xOf(s.end) - xOf(s.start)) / 2} y={barY + barH + 26} fontSize="10" fill={s.color} textAnchor="middle">{s.label}</text>
      ))}
    </svg>
  )
}

function WeightCurve({ current, target, targetDate }: { current?: number; target?: number; targetDate?: string }) {
  if (!current || !target || !targetDate) return <p style={{ color: '#999', fontSize: 14 }}>已达目标体重</p>
  const W = 260, H = 100, padL = 36, padB = 20, months = 6
  const pts = Array.from({ length: months + 1 }, (_, i) => ({ x: padL + (i / months) * W, y: 8 + (i / months) * H }))
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2
    d += ` C ${cpx} ${pts[i - 1].y}, ${cpx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`
  }
  return (
    <svg width="100%" viewBox={`0 0 ${W + padL + 10} ${H + padB + 16}`}>
      <line x1={padL} y1={8} x2={padL} y2={H + 8} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={padL} y1={H + 8} x2={padL + W} y2={H + 8} stroke="#e5e7eb" strokeWidth="1" />
      <text x={padL - 4} y={12} fontSize="10" fill="#999" textAnchor="end">{current}kg</text>
      <text x={padL - 4} y={H + 8} fontSize="10" fill="#10b981" textAnchor="end">{target}kg</text>
      <text x={padL} y={H + padB + 8} fontSize="10" fill="#999" textAnchor="middle">{new Date().getMonth() + 1}月</text>
      <text x={padL + W} y={H + padB + 8} fontSize="10" fill="#10b981" textAnchor="middle">{new Date(targetDate).getMonth() + 1}月</text>
      <path d={d} fill="none" stroke="#0070f3" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={pts[0].x} cy={pts[0].y} r="4" fill="#0070f3" />
      <circle cx={pts[months].x} cy={pts[months].y} r="4" fill="#10b981" />
    </svg>
  )
}
