'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'

export default function OfferPage() {
  const params = useParams()
  const listingId = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const loaded = useRef(false)

  const [listing, setListing] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Hidden price flow
  const [buyerMaxPrice, setBuyerMaxPrice] = useState('')
  const [phase, setPhase] = useState<'input' | 'calculating' | 'result' | 'no_match' | 'confirmed' | 'already'>('input')
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [displayPrice, setDisplayPrice] = useState(0)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (loaded.current) return
    loaded.current = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/login?redirect=/offer/${listingId}`); return }
    setUser(user)

    const { data } = await supabase
      .from('listings')
      .select('*, events ( name, event_date, province ), users ( display_name, avatar_url )')
      .eq('id', listingId)
      .single()

    if (!data) { setError('ไม่พบประกาศ'); setLoading(false); return }

    // Check if already offered
    const { data: existing } = await supabase
      .from('offers')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) { setPhase('already'); }

    setListing(data)
    setLoading(false)
  }, [listingId])

  useEffect(() => { load() }, [load])

  // Animated price counter
  useEffect(() => {
    if (phase !== 'result') return
    const target = calculatedPrice
    const duration = 1500
    const steps = 30
    const increment = target / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), target)
      setDisplayPrice(current)
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [phase, calculatedPrice])

  const handleOpenPriceConfirm = async () => {
    if (!user || !listing) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('offers').insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.user_id,
      offer_price: listing.asking_price,
      message: message || null,
      status: 'pending',
    })

    if (err) {
      setError(err.message.includes('unique') ? 'คุณยื่นข้อเสนอไปแล้ว' : err.message)
      setSubmitting(false)
      return
    }

    setPhase('confirmed')
    setSubmitting(false)
  }

  const handleHiddenPriceCalculate = () => {
    const buyerMax = parseInt(buyerMaxPrice)
    if (!buyerMax || buyerMax <= 0) { setError('กรุณากรอกราคา'); return }

    setPhase('calculating')
    setError('')

    // Simulate calculation delay for cool effect
    setTimeout(() => {
      const sellerMin = listing.min_price || listing.asking_price
      
      if (buyerMax < sellerMin) {
        setPhase('no_match')
      } else {
        const midPrice = Math.round((sellerMin + buyerMax) / 2)
        setCalculatedPrice(midPrice)
        setPhase('result')
      }
    }, 3000)
  }

  const handleHiddenPriceConfirm = async () => {
    if (!user || !listing) return
    setSubmitting(true)

    const { error: err } = await supabase.from('offers').insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.user_id,
      offer_price: calculatedPrice,
      message: message || null,
      status: 'pending',
    })

    if (err) {
      setError(err.message.includes('unique') ? 'คุณยื่นข้อเสนอไปแล้ว' : err.message)
      setSubmitting(false)
      return
    }

    setPhase('confirmed')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="pb-24"><Header title="ยื่นข้อเสนอ" showBack />
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="pb-24"><Header title="ยื่นข้อเสนอ" showBack />
        <div className="p-4 text-center py-16 text-gray-400">{error || 'ไม่พบประกาศ'}</div>
      </div>
    )
  }

  const ev = listing.events
  const thaiDate = ev ? new Date(ev.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''
  const includes: string[] = []
  if (listing.includes_bib) includes.push(`บิบ${listing.bib_gender ? ` (${listing.bib_gender})` : ''}`)
  if (listing.includes_shirt) includes.push(`เสื้อ${listing.shirt_size ? ` ${listing.shirt_size}` : ''}`)
  if (listing.includes_finisher_shirt) includes.push(`Finisher${listing.finisher_shirt_size ? ` ${listing.finisher_shirt_size}` : ''}`)
  if (listing.includes_medal) includes.push('เหรียญ')
  if (listing.includes_other) includes.push(listing.includes_other)

  // ========== CONFIRMED ==========
  if (phase === 'confirmed') {
    return (
      <div className="pb-24"><Header title="ยื่นข้อเสนอ" />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ยื่นข้อเสนอสำเร็จ!</h2>
          <p className="text-gray-400 text-sm text-center mb-6">รอผู้ขายตอบรับ<br/>คุณจะเห็นสถานะในหน้า &quot;แมทช์&quot;</p>
          <button onClick={() => router.push('/matches')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-sm">
            ดูข้อเสนอของฉัน
          </button>
        </div>
      </div>
    )
  }

  // ========== ALREADY OFFERED ==========
  if (phase === 'already') {
    return (
      <div className="pb-24"><Header title="ยื่นข้อเสนอ" showBack />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-5xl mb-4">📩</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ยื่นข้อเสนอไปแล้ว</h2>
          <p className="text-gray-400 text-sm text-center mb-6">คุณได้ยื่นข้อเสนอสำหรับประกาศนี้แล้ว<br/>รอผู้ขายตอบรับ</p>
          <button onClick={() => router.push('/matches')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-sm">
            ดูข้อเสนอของฉัน
          </button>
        </div>
      </div>
    )
  }

  // ========== CALCULATING ANIMATION ==========
  if (phase === 'calculating') {
    return (
      <div className="pb-24"><Header title="คำนวณราคา" />
        <div className="p-4 flex flex-col items-center justify-center min-h-[70vh]">
          {/* Animated circles */}
          <div className="relative w-40 h-40 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping-slow opacity-30" />
            <div className="absolute inset-4 rounded-full border-4 border-blue-300 animate-ping-slow opacity-40" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-8 rounded-full border-4 border-blue-400 animate-ping-slow opacity-50" style={{ animationDelay: '1s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
                <span className="text-3xl">⚡</span>
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">กำลังคำนวณราคาที่เป็นธรรม</h2>
          <p className="text-gray-400 text-sm text-center">วิเคราะห์ราคาจากทั้งสองฝ่าย...</p>
          <div className="flex gap-1 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    )
  }

  // ========== NO MATCH ==========
  if (phase === 'no_match') {
    return (
      <div className="pb-24"><Header title="ราคาไม่ตรงกัน" showBack />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">😔</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ราคาไม่ตรงกัน</h2>
          <p className="text-gray-400 text-sm text-center mb-2">ราคาที่คุณเสนอต่ำกว่าราคาที่ผู้ขายรับได้</p>
          <p className="text-gray-300 text-xs mb-6">ลองเพิ่มงบประมาณหรือหาประกาศอื่น</p>
          <div className="flex gap-3">
            <button onClick={() => { setPhase('input'); setBuyerMaxPrice('') }} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-semibold text-sm">
              ลองใหม่
            </button>
            <button onClick={() => router.push('/search')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm">
              หาบิบอื่น
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== RESULT (hidden price matched) ==========
  if (phase === 'result') {
    return (
      <div className="pb-24"><Header title="ราคาที่เป็นธรรม" />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">ราคาตรงกัน!</h2>
          <p className="text-gray-400 text-sm mb-6">ระบบคำนวณราคาที่เป็นธรรมสำหรับทั้งสองฝ่าย</p>
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white text-center w-full max-w-xs shadow-xl shadow-blue-600/30 mb-6">
            <div className="text-sm text-blue-200 mb-1">ราคาที่เสนอ</div>
            <div className="text-4xl font-extrabold">฿{displayPrice.toLocaleString()}</div>
            <div className="text-xs text-blue-200 mt-2">คำนวณจากราคาทั้งสองฝ่าย</div>
          </div>

          {/* Listing summary */}
          <div className="bg-gray-50 rounded-xl p-3 w-full mb-4">
            <div className="text-sm font-semibold text-gray-700">{ev?.name} • {listing.distance}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {includes.map(inc => <span key={inc} className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>)}
            </div>
          </div>

          <div className="w-full space-y-2">
            <input type="text" value={message} onChange={e => setMessage(e.target.value)}
              placeholder="ข้อความถึงผู้ขาย (ไม่บังคับ)" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
            <button onClick={handleHiddenPriceConfirm} disabled={submitting}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
              {submitting ? 'กำลังส่ง...' : `ยืนยัน ฿${calculatedPrice.toLocaleString()}`}
            </button>
            <button onClick={() => router.back()} className="w-full py-2 text-gray-400 text-sm">ยกเลิก</button>
          </div>
        </div>
      </div>
    )
  }

  // ========== INPUT PHASE ==========
  return (
    <div className="pb-24">
      <Header title="ยื่นข้อเสนอ" showBack />
      <div className="p-4 space-y-4">
        {/* Listing info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex gap-3 items-start">
            {listing.bib_image_url && (
              <img src={listing.bib_image_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">{ev?.name} • {listing.distance}</h3>
              <div className="text-xs text-gray-400 mt-0.5">{thaiDate} • {ev?.province}</div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {includes.map(inc => <span key={inc} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {listing.users?.avatar_url ? (
                  <img src={listing.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px]">🏃</div>
                )}
                <span className="text-xs text-gray-500">{listing.users?.display_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* OPEN PRICE */}
        {listing.price_mode === 'open' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
              <div className="text-sm text-gray-500 mb-1">ราคา</div>
              <div className="text-4xl font-extrabold text-blue-600">฿{listing.asking_price?.toLocaleString()}</div>
            </div>

            <div>
              <input type="text" value={message} onChange={e => setMessage(e.target.value)}
                placeholder="ข้อความถึงผู้ขาย (ไม่บังคับ)" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

            <button onClick={handleOpenPriceConfirm} disabled={submitting}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 disabled:opacity-50">
              {submitting ? 'กำลังส่ง...' : `ยืนยันซื้อ ฿${listing.asking_price?.toLocaleString()}`}
            </button>
          </div>
        )}

        {/* HIDDEN PRICE */}
        {listing.price_mode === 'hidden' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 text-center">
              <div className="text-sm text-gray-500 mb-1">โหมดราคาซ่อน</div>
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-xs text-gray-400">ระบบจะคำนวณราคาที่เป็นธรรมจากราคาของทั้งสองฝ่าย</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ราคาสูงสุดที่คุณรับได้ ฿</label>
              <input type="number" value={buyerMaxPrice} onChange={e => setBuyerMaxPrice(e.target.value)}
                placeholder="เช่น 2000" className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold" />
              <p className="text-xs text-gray-400 mt-1">ผู้ขายจะไม่เห็นราคานี้ ระบบจะใช้คำนวณเท่านั้น</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

            <button onClick={handleHiddenPriceCalculate} disabled={!buyerMaxPrice}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20 disabled:opacity-50">
              ⚡ คำนวณราคา
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
