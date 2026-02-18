'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    
    router.push(redirect)
    router.refresh()
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name || email.split('@')[0] },
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('สมัครสำเร็จ! สามารถเข้าใช้งานได้เลย')
    // Auto login after register (since confirm email is OFF)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (!loginError) {
      router.push(redirect)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="pb-24">
      <Header title="เข้าสู่ระบบ" showBack />
      <div className="p-4 space-y-4">
        {/* Logo */}
        <div className="text-center py-6">
          <div className="text-5xl mb-3">🏃</div>
          <h2 className="text-xl font-bold text-gray-800">PloiBib | ปล่อยบิบ</h2>
          <p className="text-sm text-gray-400 mt-1">หาคนรับบิบแทน อย่างปลอดภัยกว่าเดิม</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[{ v: 'login' as const, l: 'เข้าสู่ระบบ' }, { v: 'register' as const, l: 'สมัครสมาชิก' }].map(t =>
            <button key={t.v} onClick={() => { setTab(t.v); setError(''); setMessage('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t.v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{t.l}</button>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อที่แสดง</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อของคุณ" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" className="w-full p-3 border border-gray-200 rounded-xl text-sm"
              onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())} />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
          {message && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl">{message}</div>}

          <button onClick={tab === 'login' ? handleLogin : handleRegister} disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'กำลังดำเนินการ...' : tab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="pb-24">
        <Header title="เข้าสู่ระบบ" showBack />
        <div className="p-4 flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
