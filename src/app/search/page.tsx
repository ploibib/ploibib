'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-client'

export default function SearchPage() {
  const supabase = createClient()

  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('ทั้งหมด')

  const filters = ['ทั้งหมด', 'ขาย', 'ซื้อ', 'Full', 'Half', '10K', '5K']

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select(`
        *,
        events ( id, name, name_en, event_date, province, venue ),
        users ( display_name, avatar_url )
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(50)

    // Fetch user stats for reputation
    const userIds = [...new Set(data?.map(l => l.user_id) || [])]
    let statsMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('*')
        .in('user_id', userIds)
      userStats?.forEach(s => { statsMap[s.user_id] = s })
    }

    // Attach stats to listings
    const enriched = (data || []).map(l => ({
      ...l,
      _stats: statsMap[l.user_id] || null
    }))

    setListings(enriched)
    setLoading(false)
  }

  function getRepLevel(stats: any) {
    if (!stats) return 'new'
    const score = 50 + (stats.completed_deals * 5) - (stats.cancelled_deals * 15) - (stats.no_response_count * 10)
    if (score >= 81) return 'highly_trusted'
    if (score >= 56) return 'trusted'
    return 'new'
  }

  const repLabels: Record<string, { text: string; cls: string }> = {
    new: { text: 'ใหม่', cls: 'text-gray-400 bg-gray-50' },
    trusted: { text: 'Trusted', cls: 'text-blue-600 bg-blue-50' },
    highly_trusted: { text: 'Highly Trusted', cls: 'text-emerald-600 bg-emerald-50' },
  }

  // Filter + Search
  const filteredListings = listings.filter(l => {
    const ev = l.events

    // Text search (event name Thai/English, province, distance, seller name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const searchFields = [
        ev?.name, ev?.name_en, ev?.province, ev?.venue,
        l.distance, l.users?.display_name, l.meetup_location, l.note
      ].filter(Boolean).join(' ').toLowerCase()

      if (!searchFields.includes(q)) return false
    }

    // Category filter
    if (filter === 'ขาย' && l.type !== 'sell') return false
    if (filter === 'ซื้อ' && l.type !== 'buy') return false
    if (filter === 'Full' && !l.distance?.includes('42')) return false
    if (filter === 'Half' && !l.distance?.includes('21')) return false
    if (filter === '10K' && !l.distance?.includes('10')) return false
    if (filter === '5K' && !l.distance?.includes('5K')) return false

    return true
  })

  return (
    <div className="pb-24">
      <Header title="หาบิบ" showBack />
      <div className="p-4 space-y-4">

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหางานวิ่ง, จังหวัด, ผู้ขาย..."
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{f}</button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-xs text-gray-400">
          {loading ? 'กำลังโหลด...' : `${filteredListings.length} ประกาศ`}
          {searchQuery && ` สำหรับ "${searchQuery}"`}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400 text-sm">กำลังโหลด...</div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{searchQuery ? '🔍' : '📭'}</div>
            <div className="text-gray-500 font-medium">
              {searchQuery ? `ไม่พบผลลัพธ์สำหรับ "${searchQuery}"` : 'ยังไม่มีประกาศในระบบ'}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {searchQuery ? 'ลองเปลี่ยนคำค้นหาดูครับ' : 'เป็นคนแรกที่ลงบิบ!'}
            </div>
            {!searchQuery && (
              <Link href="/create" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
                📤 ลงบิบ
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((l: any) => {
              const ev = l.events
              const level = getRepLevel(l._stats)
              const rep = repLabels[level]
              const eventDate = ev ? new Date(ev.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''

              // Build includes list
              const includes: string[] = []
              if (l.includes_bib) includes.push(`บิบ${l.bib_gender ? ` (${l.bib_gender})` : ''}`)
              if (l.includes_shirt) includes.push(`เสื้อ${l.shirt_size ? ` ${l.shirt_size}` : ''}`)
              if (l.includes_finisher_shirt) includes.push(`Finisher${l.finisher_shirt_size ? ` ${l.finisher_shirt_size}` : ''}`)
              if (l.includes_medal) includes.push('เหรียญ')
              if (l.includes_other) includes.push(l.includes_other)

              return (
                <Link key={l.id} href={`/event?id=${ev?.id}`} className="block">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md hover:border-blue-100 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-sm">
                          {ev?.name || 'งานวิ่ง'} • {l.distance}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <span>{eventDate}</span>
                          {ev?.province && <><span>•</span><span>{ev.province}</span></>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {/* Seller avatar + name */}
                          <div className="flex items-center gap-1.5">
                            {l.users?.avatar_url ? (
                              <img src={l.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px]">🏃</div>
                            )}
                            <span className="text-xs text-gray-500">{l.users?.display_name}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${rep.cls}`}>
                            {level !== 'new' && <span className={`w-1.5 h-1.5 rounded-full ${level === 'highly_trusted' ? 'bg-emerald-500' : 'bg-blue-500'}`} />}
                            {rep.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end max-w-[130px]">
                        {includes.map(inc => (
                          <span key={inc} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>
                        ))}
                      </div>
                    </div>

                    {l.meetup_location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        <span>นัดรับ: {l.meetup_location}</span>
                      </div>
                    )}

                    {l.note && (
                      <div className="text-xs text-gray-400 mb-3 italic">&quot;{l.note}&quot;</div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.type === 'sell' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {l.type === 'sell' ? '📤 ขาย' : '🔍 ซื้อ'}
                      </span>
                      {l.price_mode === 'open' ? (
                        <div className="text-xl font-extrabold text-blue-600">฿{l.asking_price?.toLocaleString()}</div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">🔒 ราคาซ่อน</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
