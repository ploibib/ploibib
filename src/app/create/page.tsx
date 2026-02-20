'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'

const SHIRT_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const DEFAULT_DISTANCES = ['5K', '10K', '21.1K', '42.2K']

export default function CreateListingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Event search
  const [eventSearch, setEventSearch] = useState('')
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // New event form
  const [newEventName, setNewEventName] = useState('')
  const [newEventNameEn, setNewEventNameEn] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventProvince, setNewEventProvince] = useState('')
  const [newEventVenue, setNewEventVenue] = useState('')

  // Form state
  const [type, setType] = useState<'sell' | 'buy'>('sell')
  const [distance, setDistance] = useState('')
  const [customDistance, setCustomDistance] = useState('')
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
  const [otherChecked, setOtherChecked] = useState(false)
  const [otherText, setOtherText] = useState('')

  // Photo upload
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
      const evts = data || []
      setEvents(evts)

      // Pre-fill from URL params
      const paramType = searchParams.get('type')
      const paramEvent = searchParams.get('event')
      const paramDistance = searchParams.get('distance')

      if (paramType === 'buy' || paramType === 'sell') setType(paramType)

      if (paramEvent) {
        const found = evts.find((e: any) => e.id === paramEvent)
        if (found) {
          setSelectedEvent(found)
          setEventSearch(found.name)
        }
      }

      if (paramDistance) setDistance(paramDistance)
    }
    fetchEvents()
  }, [])

  // Close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowEventDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredEvents = events.filter(e => {
    const q = eventSearch.toLowerCase().trim()
    if (!q) return true
    return e.name?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.province?.toLowerCase().includes(q)
  })

  const availableDistances = selectedEvent?.available_distances?.length > 0
    ? [...selectedEvent.available_distances] : DEFAULT_DISTANCES

  const handleSelectEvent = (ev: any) => {
    setSelectedEvent(ev)
    setEventSearch(ev.name)
    setShowEventDropdown(false)
    setDistance('')
    setShowAddEvent(false)
  }

  const handleAddNewEvent = async () => {
    if (!newEventName || !newEventDate || !newEventProvince) {
      setError('กรุณากรอกชื่องาน วันที่ และจังหวัด')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?redirect=/create'); return }

    const { data, error: insertError } = await supabase.from('events').insert({
      name: newEventName, name_en: newEventNameEn || null, event_date: newEventDate,
      province: newEventProvince, venue: newEventVenue || null,
      available_distances: DEFAULT_DISTANCES, is_verified: false, is_active: true, created_by: user.id,
    }).select().single()

    if (insertError) { setError('เพิ่มงานไม่สำเร็จ: ' + insertError.message); return }
    setEvents(prev => [...prev, data])
    handleSelectEvent(data)
    setShowAddEvent(false)
    setError('')
  }

  // Photo handlers
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxPhotos = 3
    const remaining = maxPhotos - photos.length

    files.slice(0, remaining).forEach(file => {
      if (file.size > 2097152) { alert('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)'); return }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('รองรับเฉพาะ JPG, PNG, WEBP'); return }
      const preview = URL.createObjectURL(file)
      setPhotos(prev => [...prev, { file, preview }])
    })
    e.target.value = ''
  }

  const handlePhotoRemove = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const uploadPhotos = async (userId: string): Promise<{ bibImageUrl: string | null; additionalImages: string[] }> => {
    if (photos.length === 0) return { bibImageUrl: null, additionalImages: [] }

    setUploadingPhotos(true)
    const urls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i].file
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, file)
      if (uploadError) continue

      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
      urls.push(publicUrl)
    }

    setUploadingPhotos(false)
    return {
      bibImageUrl: urls[0] || null,
      additionalImages: urls.slice(1),
    }
  }

  const handleSubmit = async () => {
    const finalDistance = distance === 'อื่นๆ' ? customDistance : distance
    if (!selectedEvent || !finalDistance || !askingPrice) {
      setError('กรุณากรอกข้อมูลให้ครบ: งานวิ่ง, ระยะทาง, ราคา')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?redirect=/create'); return }

    // Upload photos (only for sellers)
    let bibImageUrl = null
    let additionalImages: string[] = []
    if (type === 'sell' && photos.length > 0) {
      const uploaded = await uploadPhotos(user.id)
      bibImageUrl = uploaded.bibImageUrl
      additionalImages = uploaded.additionalImages
    }

    const { error: insertError } = await supabase.from('listings').insert({
      user_id: user.id,
      event_id: selectedEvent.id,
      type,
      distance: finalDistance,
      includes_bib: type === 'sell' ? bibChecked : true,
      bib_gender: type === 'sell' && bibChecked ? bibGender : null,
      includes_shirt: type === 'sell' ? shirtChecked : false,
      shirt_size: type === 'sell' && shirtChecked ? shirtSize : null,
      includes_finisher_shirt: type === 'sell' ? finisherChecked : false,
      finisher_shirt_size: type === 'sell' && finisherChecked ? finisherSize : null,
      includes_medal: type === 'sell' ? medalChecked : false,
      includes_other: type === 'sell' && otherChecked && otherText ? otherText : null,
      price_mode: priceMode,
      asking_price: parseInt(askingPrice),
      min_price: priceMode === 'hidden' && minPrice ? parseInt(minPrice) : null,
      max_price: type === 'buy' && priceMode === 'hidden' && minPrice ? parseInt(minPrice) : null,
      meetup_location: meetup || null,
      note: note || null,
      bib_image_url: bibImageUrl,
      additional_images: additionalImages.length > 0 ? additionalImages : null,
      status: 'waiting',
    })

    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/search'), 1500)
  }

  if (success) {
    return (
      <div className="pb-24">
        <Header title="ลงบิบ" />
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">สำเร็จ!</h2>
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
          {[{ v: 'sell' as const, l: 'ปล่อยบิบ 📤' }, { v: 'buy' as const, l: 'ตั้งรับบิบ 🔍' }].map(t =>
            <button key={t.v} onClick={() => setType(t.v)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${type === t.v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{t.l}</button>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {/* Event Search */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">งานวิ่ง *</label>
            <input type="text" value={eventSearch}
              onChange={e => { setEventSearch(e.target.value); setShowEventDropdown(true); if (selectedEvent && e.target.value !== selectedEvent.name) setSelectedEvent(null) }}
              onFocus={() => setShowEventDropdown(true)}
              placeholder="พิมพ์ค้นหาชื่องานวิ่ง (ไทยหรืออังกฤษ)..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
            {selectedEvent && (
              <div className="absolute right-3 top-[38px] text-emerald-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            {showEventDropdown && !selectedEvent && (
              <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-64 overflow-y-auto">
                {filteredEvents.map(ev => {
                  const d = new Date(ev.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <button key={ev.id} onClick={() => handleSelectEvent(ev)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-50 last:border-0">
                      <div className="font-semibold text-sm text-gray-800">{ev.name}</div>
                      {ev.name_en && <div className="text-xs text-gray-400">{ev.name_en}</div>}
                      <div className="text-xs text-gray-400 mt-0.5">{d} • {ev.province}</div>
                    </button>
                  )
                })}
                {filteredEvents.length === 0 && eventSearch.trim() && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">ไม่พบงานที่ค้นหา</div>
                )}
                <button onClick={() => { setShowAddEvent(true); setShowEventDropdown(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition text-blue-600 font-semibold text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  เพิ่มงานวิ่งใหม่
                </button>
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm">
              <div className="font-semibold text-blue-700">{selectedEvent.name}</div>
              <div className="text-xs text-blue-500 mt-0.5">
                {new Date(selectedEvent.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selectedEvent.province && ` • ${selectedEvent.province}`}
              </div>
              <button onClick={() => { setSelectedEvent(null); setEventSearch(''); setDistance('') }}
                className="text-xs text-blue-400 mt-1 underline">เปลี่ยนงาน</button>
            </div>
          )}

          {/* Add New Event */}
          {showAddEvent && !selectedEvent && (
            <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-amber-800">เพิ่มงานวิ่งใหม่</h3>
                <button onClick={() => setShowAddEvent(false)} className="text-amber-400 text-xs">ยกเลิก</button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่องาน (ไทย) *</label>
                <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="เช่น เชียงใหม่ มาราธอน 2025" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่องาน (อังกฤษ)</label>
                <input type="text" value={newEventNameEn} onChange={e => setNewEventNameEn(e.target.value)} placeholder="เช่น Chiang Mai Marathon 2025" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันที่แข่ง *</label>
                  <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด *</label>
                  <input type="text" value={newEventProvince} onChange={e => setNewEventProvince(e.target.value)} placeholder="เชียงใหม่" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สถานที่</label>
                <input type="text" value={newEventVenue} onChange={e => setNewEventVenue(e.target.value)} placeholder="สนามช้างอารีนา" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button onClick={handleAddNewEvent} className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition">เพิ่มงานวิ่ง</button>
            </div>
          )}

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ระยะทาง *</label>
            <div className="flex flex-wrap gap-2">
              {availableDistances.map((d: string) => (
                <button key={d} type="button" onClick={() => { setDistance(d); setCustomDistance('') }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${distance === d ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{d}</button>
              ))}
              <button type="button" onClick={() => setDistance('อื่นๆ')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${distance === 'อื่นๆ' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>อื่นๆ</button>
            </div>
            {distance === 'อื่นๆ' && (
              <input type="text" value={customDistance} onChange={e => setCustomDistance(e.target.value)}
                placeholder="พิมพ์ระยะทาง เช่น 15K, 50K" className="w-full mt-2 p-3 border border-gray-200 rounded-xl text-sm" />
            )}
          </div>

          {/* Meetup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จุดนัดรับ</label>
            <input type="text" value={meetup} onChange={e => setMeetup(e.target.value)}
              placeholder="เช่น Expo บางแสน, หน้างานแข่ง" className="w-full p-3 border border-gray-200 rounded-xl text-sm" />
          </div>

          {/* Photo Upload - sellers only */}
          {type === 'sell' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">แนบรูป (สูงสุด 3 รูป, 2MB/รูป)</label>
              <div className="flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handlePhotoRemove(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow">✕</button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] mt-1">เพิ่มรูป</span>
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoAdd} className="hidden" multiple />
            </div>
          )}

          {/* Includes - only for sellers */}
          {type === 'sell' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">สิ่งที่รวม</label>
            <div className="space-y-3">
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
              <div className={`border rounded-xl p-3 transition ${shirtChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shirtChecked} onChange={e => setShirtChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เสื้อวิ่ง</span>
                </label>
                {shirtChecked && (
                  <div className="mt-2 ml-6">
                    <div className="text-xs text-gray-400 mb-1.5">เลือกไซส์</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SHIRT_SIZES.map(s => <button key={s} type="button" onClick={() => setShirtSize(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${shirtSize === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>{s}</button>)}
                    </div>
                  </div>
                )}
              </div>
              <div className={`border rounded-xl p-3 transition ${finisherChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={finisherChecked} onChange={e => setFinisherChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เสื้อ Finisher</span>
                </label>
                {finisherChecked && (
                  <div className="mt-2 ml-6">
                    <div className="text-xs text-gray-400 mb-1.5">เลือกไซส์</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SHIRT_SIZES.map(s => <button key={s} type="button" onClick={() => setFinisherSize(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${finisherSize === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>{s}</button>)}
                    </div>
                  </div>
                )}
              </div>
              <div className={`border rounded-xl p-3 transition ${medalChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={medalChecked} onChange={e => setMedalChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">เหรียญ</span>
                </label>
              </div>
              <div className={`border rounded-xl p-3 transition ${otherChecked ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={otherChecked} onChange={e => setOtherChecked(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">อื่นๆ</span>
                </label>
                {otherChecked && (
                  <div className="mt-2 ml-6">
                    <input type="text" value={otherText} onChange={e => setOtherText(e.target.value)}
                      placeholder="เช่น ถุงผ้า, หมวก, โปสเตอร์..." className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

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
            {[{ v: 'open' as const, l: '💰 เปิดราคา' }, { v: 'hidden' as const, l: '🔒 ราคาซ่อน' }].map(t =>
              <button key={t.v} type="button" onClick={() => setPriceMode(t.v)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${priceMode === t.v ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{t.l}</button>
            )}
          </div>
          <p className="text-xs text-gray-400">{priceMode === 'open' ? 'ผู้ซื้อเห็นราคาเลย' : 'ระบบจะคำนวณราคากลางเมื่อจับคู่สำเร็จ'}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'sell' ? 'ราคาที่อยากได้ ฿ *' : 'ราคาที่อยากจ่าย ฿ *'}</label>
            <input type="number" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} placeholder="1800" className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold" />
          </div>
          {priceMode === 'hidden' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'sell' ? 'ราคาต่ำสุดที่รับได้ ฿' : 'ราคาสูงสุดที่รับได้ ฿'}</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="1500" className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold" />
            </div>
          )}
        </div>

        {/* Summary - only for sellers */}
        {type === 'sell' && (bibChecked || shirtChecked || finisherChecked || medalChecked || otherChecked) && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-2">สรุปสิ่งที่รวม</div>
            <div className="flex flex-wrap gap-2">
              {bibChecked && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">บิบ ({bibGender})</span>}
              {shirtChecked && shirtSize && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">เสื้อวิ่ง {shirtSize}</span>}
              {shirtChecked && !shirtSize && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">เสื้อวิ่ง (ยังไม่เลือกไซส์)</span>}
              {finisherChecked && finisherSize && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">เสื้อ Finisher {finisherSize}</span>}
              {finisherChecked && !finisherSize && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">เสื้อ Finisher (ยังไม่เลือกไซส์)</span>}
              {medalChecked && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">เหรียญ</span>}
              {otherChecked && otherText && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">{otherText}</span>}
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        <button onClick={handleSubmit} disabled={loading || uploadingPhotos}
          className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 disabled:opacity-50">
          {loading || uploadingPhotos ? 'กำลังดำเนินการ...' : type === 'sell' ? 'ปล่อยบิบ..' : 'ตั้งรับบิบ..'}
        </button>
      </div>
    </div>
  )
}
