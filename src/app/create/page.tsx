'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'

const SHIRT_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export default function CreateListingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [type, setType] = useState<'sell' | 'buy'>('sell')
  const [eventId, setEventId] = useState('')
  const [distance, setDistance] = useState('')
  const [meetup, setMeetup] = useState('')
  const [note, setNote] = useState('')
  const [priceMode, setPriceMode] = useState<'open' | 'hidden'>('open')
  const [askingPrice, setAskingPrice] = useState('')
  const [minPrice, setMinPrice] = useState('')

  // Includes
  const [bibChecked, setBibChecked] = useState(true)
  const [bibGender, setBibGender] = useState('ชาย')
  const [shirtChecked, setShirtChecked] = useState(false)
  const [shirtSize, setShirtSize] = useState('')
  const [finisherChecked, setFinisherChecked] = useState(false)
  const [finisherSize, setFinisherSize] = useState('')
  const [medalChecked, setMedalChecked] = useState(false)

  const selectedEvent = events.find(e => e.id === eventId)

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
      setEvents(data || [])
    }
    fetchEvents()
  }, [])

  const handleSubmit = async () => {
    if (!eventId || !distance || !askingPrice) {
      setError('กรุณากรอกข้อมูลให้ครบ: งานวิ่ง, ระยะทาง, ราคา')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=/create')
      return
    }

    const { error: insertError } = await supabase.from('listings').insert({
      user_id: user.id,
      event_id: eventId,
      type,
      distance,
      includes_bib: bibChecked,
      bib_gender: bibChecked ? bibGender : null,
      includes_shirt: shirtChecked,
      shirt_size: shirtChecked ? shirtSize : null,
      includes_finisher_shirt: finisherChecked,
      finisher_shirt_size: finisherChecked ? finisherSize : null,
      includes_medal: medalChecked,
      price_mode: priceMode,
      asking_price: parseInt(askingPrice),
      min_price: priceMode === 'hidden' && minPrice ? parseInt(minPrice) : null,
      meetup_location: meetup || null,
      note: note || null,
      status: 'waiting',
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/search'), 1500)
  }

  if (success) {
    return (
      <div className="pb-24">
        <Header title="ลงบิบ" />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">ลงบิบสำเร็จ!</h2>
          <p className="text-gray-400 text-sm">กำลังพาไปหน้าหาบิบ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <Header title="ลงบิบ" showBack />
      <div className="p-4 space-y-4">
        {/* Sell / Buy Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[{ v: 'sell' as const, l: 'ขายบิบ 📤' }, { v: 'buy' as const, l: 'หาซื้อบิบ 🔍' }].map(t =>
            <button key={t.v} onClick={() => setType(t.v)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${type === t.v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{t.l}</button>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {/* Event */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">งานวิ่ง *</label>
            <select value={eventId} onChange={e => { setEventId(e.target.value); setDistance('') }}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm">
              <option value="">เลือกงานวิ่ง...</option>
              {events.map(e => {
                const d = new Date(e.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                return <option key={e.id} value={e.id}>{e.name} ({d})</option>
              })}
            </select>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ระยะทาง *</label>
            <select value={distance} onChange={e => setDistance(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm">
              <option value="">เลือกระยะทาง...</option>
              {(selectedEvent?.available_distances || []).map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Meetup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จุดนัดรับ</label>
            <input type="text" value={meetup} onChange={e => setMeetup(e.target.value)}
              placeholder="เช่น Expo บางแสน, หน้างานแข่ง" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>

          {/* Includes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">สิ่งที่รวม</label>
            <div className="space-y-3">
              {/* บิบ */}
              <div className={`border rounded-xl p-3 transition ${bibChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bibChecked} onChange={e => setBibChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">บิบ</span>
                </label>
                {bibChecked && (
                  <div className="mt-2 ml-6 flex gap-2">
                    {['ชาย', 'หญิง'].map(g =>
                      <button key={g} type="button" onClick={() => setBibGender(g)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${bibGender === g ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        {g === 'ชาย' ? '👨 ชาย' : '👩 หญิง'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* เสื้อวิ่ง */}
              <div className={`border rounded-xl p-3 transition ${shirtChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shirtChecked} onChange={e => setShirtChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เสื้อวิ่ง</span>
                </label>
                {shirtChecked && (
                  <div className="mt-2 ml-6">
                    <div className="text-xs text-gray-400 mb-1.5">เลือกไซส์</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SHIRT_SIZES.map(s =>
                        <button key={s} type="button" onClick={() => setShirtSize(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${shirtSize === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>{s}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* เสื้อ Finisher */}
              <div className={`border rounded-xl p-3 transition ${finisherChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={finisherChecked} onChange={e => setFinisherChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เสื้อ Finisher</span>
                </label>
                {finisherChecked && (
                  <div className="mt-2 ml-6">
                    <div className="text-xs text-gray-400 mb-1.5">เลือกไซส์</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SHIRT_SIZES.map(s =>
                        <button key={s} type="button" onClick={() => setFinisherSize(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${finisherSize === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>{s}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* เหรียญ */}
              <div className={`border rounded-xl p-3 transition ${medalChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={medalChecked} onChange={e => setMedalChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เหรียญ</span>
                </label>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm" placeholder="รายละเอียดเพิ่มเติม..." />
          </div>
        </div>

        {/* Price */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <label className="block text-sm font-medium text-gray-700">โหมดราคา</label>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[{ v: 'open' as const, l: 'เปิดราคา' }, { v: 'hidden' as const, l: 'ราคาซ่อน' }].map(t =>
              <button key={t.v} type="button" onClick={() => setPriceMode(t.v)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${priceMode === t.v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{t.l}</button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'sell' ? 'ราคาขาย ฿ *' : 'ราคาที่อยากจ่าย ฿ *'}
            </label>
            <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)}
              placeholder="1800" className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold" />
          </div>

          {priceMode === 'hidden' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'sell' ? 'ราคาต่ำสุดที่รับได้ ฿' : 'ราคาสูงสุดที่รับได้ ฿'}
              </label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                placeholder="1500" className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold" />
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 disabled:opacity-50">
          {loading ? 'กำลังลงบิบ...' : `ลงบิบ${type === 'sell' ? 'ขาย' : 'ซื้อ'}`}
        </button>
      </div>
    </div>
  )
}
