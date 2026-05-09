'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { key: 'gender',        label: '你的性别是？' },
  { key: 'goal',          label: '你的健身目标是？' },
  { key: 'age',           label: '你的年龄是？' },
  { key: 'height',        label: '你的身高是？（cm）' },
  { key: 'weight',        label: '你目前的体重是？（kg）' },
  { key: 'targetWeight',  label: '你的目标体重是？（kg）' },
  { key: 'activityLevel', label: '你的运动频率是？' },
]

const OPTIONS: Record<string, { value: string; label: string }[]> = {
  gender: [
    { value: 'male',   label: '男' },
    { value: 'female', label: '女' },
  ],
  goal: [
    { value: 'lose_weight',   label: '减重' },
    { value: 'tone_up',       label: '塑形' },
    { value: 'build_muscle',  label: '增肌' },
  ],
  activityLevel: [
    { value: 'sedentary',   label: '久坐（几乎不运动）' },
    { value: 'light',       label: '轻度（每周1-3次）' },
    { value: 'moderate',    label: '中度（每周3-5次）' },
    { value: 'active',      label: '活跃（每周6-7次）' },
    { value: 'very_active', label: '非常活跃（每天高强度）' },
  ],
}

const NUMBER_FIELDS = ['age', 'height', 'weight', 'targetWeight']
const NUMBER_META: Record<string, { unit: string; min: number; max: number; hint: string }> = {
  age:          { unit: '岁', min: 10,  max: 100, hint: '请输入 10-100 之间的年龄' },
  height:       { unit: 'cm', min: 50,  max: 250, hint: '请输入 50-250cm 之间的身高' },
  weight:       { unit: 'kg', min: 20,  max: 300, hint: '请输入 20-300kg 之间的体重' },
  targetWeight: { unit: 'kg', min: 20,  max: 300, hint: '请输入 20-300kg 之间的目标体重' },
}

export default function QuestionnairePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, string>>({
    gender: '', goal: '', age: '', height: '', weight: '', targetWeight: '', activityLevel: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assessmentIdReady = useRef<Promise<string>>(null as unknown as Promise<string>)
  const resolveId = useRef<(id: string) => void>(null as unknown as (id: string) => void)
  if (!assessmentIdReady.current) {
    assessmentIdReady.current = new Promise(r => { resolveId.current = r })
  }

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('sessionToken')
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: stored ?? undefined }),
      })
      const data = await res.json()
      localStorage.setItem('sessionToken', data.sessionToken)
      resolveId.current(data.recordId)
      if (data.progress && Object.keys(data.progress).length > 0) {
        setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(data.progress).map(([k, v]) => [k, String(v)])) }))
        const filled = Object.values(data.progress).filter(Boolean).length
        const resumeStep = Math.min(filled, STEPS.length - 1)
        setStep(resumeStep)
        router.replace(`/questionnaire?step=${resumeStep + 1}`)
      }
    }
    init()
  }, [])

  const safeStep = Math.min(step, STEPS.length - 1)
  const currentKey = STEPS[safeStep].key
  const isChoice = !!OPTIONS[currentKey]
  const isLast = safeStep === STEPS.length - 1

  const goToStep = (s: number) => {
    setStep(s)
    router.replace(`/questionnaire?step=${s + 1}`)
  }

  const saveStep = async (key: string, value: string) => {
    const id = await assessmentIdReady.current
    const token = localStorage.getItem('sessionToken')
    const payload = NUMBER_FIELDS.includes(key) ? { [key]: Number(value) } : { [key]: value }
    const res = await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  const next = async (value?: string) => {
    setError('')
    const val = value ?? form[currentKey]
    if (!val) { setError('请先选择或填写'); return }

    // 数字字段范围校验
    if (NUMBER_FIELDS.includes(currentKey)) {
      const meta = NUMBER_META[currentKey]
      const num = Number(val)
      if (isNaN(num) || num < meta.min || num > meta.max) {
        setError(meta.hint)
        return
      }
    }

    if (value) setForm(f => ({ ...f, [currentKey]: value }))

    try {
      await saveStep(currentKey, val)
    } catch {
      setError('保存失败，请重试')
      return
    }

    if (!isLast) {
      goToStep(safeStep + 1)
      return
    }

    setLoading(true)
    const id = await assessmentIdReady.current
    const res = await fetch(`/api/records/${id}/submit`, { method: 'POST' })
    if (res.ok) {
      localStorage.setItem('recordId', id)
      router.push('/auth')
    } else {
      setError('提交失败，请检查填写内容')
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>{safeStep + 1} / {STEPS.length}</p>
      <div style={{ height: 4, background: '#eee', borderRadius: 2, marginBottom: 28 }}>
        <div style={{ height: 4, background: '#0070f3', borderRadius: 2, width: `${((safeStep + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 24 }}>{STEPS[safeStep].label}</h2>

      {isChoice ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {OPTIONS[currentKey].map(opt => (
            <button key={opt.value} onClick={() => next(opt.value)}
              style={{ padding: '14px 18px', border: `2px solid ${form[currentKey] === opt.value ? '#0070f3' : '#ddd'}`, borderRadius: 10, cursor: 'pointer', background: form[currentKey] === opt.value ? '#e8f0fe' : '#fff', textAlign: 'left', fontSize: 15 }}>
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={NUMBER_META[currentKey].min} max={NUMBER_META[currentKey].max}
              value={form[currentKey]}
              onChange={e => setForm(f => ({ ...f, [currentKey]: e.target.value }))}
              style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 18 }} />
            <span style={{ color: '#666' }}>{NUMBER_META[currentKey].unit}</span>
          </div>
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
            范围：{NUMBER_META[currentKey].min} - {NUMBER_META[currentKey].max} {NUMBER_META[currentKey].unit}
          </p>
          <button onClick={() => next()} disabled={loading}
            style={{ padding: '14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
            {loading ? '计算中...' : isLast ? '查看结果' : '下一步'}
          </button>
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: 12, fontSize: 14 }}>{error}</p>}

      {safeStep > 0 && (
        <button onClick={() => goToStep(safeStep - 1)}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}>
          ← 上一步
        </button>
      )}
    </main>
  )
}
