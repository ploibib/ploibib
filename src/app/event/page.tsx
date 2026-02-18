import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-server'

export default async function EventPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  if (!id) return <div className="p-8 text-center text-gray-400">ไม่พบงานวิ่ง</div>

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) return <div className="p-8 text-center text-gray-400">ไม่พบงานวิ่ง</div>

  // Fetch listings for this event
  const { data: listings } = await supabase
    .from('listings')
    .select('*, users ( display_name )')
    .eq('event_id', id)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })

  const thaiDate = new Date(event.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  const sellCount = listings?.filter(l => l.type === 'sell').length || 0
  const buyCount = listings?.filter(l => l.type === 'buy').length || 0

  return (
    <div className="pb-24">
      <Header title={event.name} showBack />
      <div className="p-4 space-y-4">
        {/* Event Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">{event.name}</h2>
          {event.name_en && <p className="text-xs text-gray-400">{event.name_en}</p>}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>{thaiDate}</span><span>•</span><span>{event.province}</span>
          </div>
          {event.venue && <div className="text-xs text-gray-300 mt-0.5">{event.venue}</div>}
          <div className="flex gap-2 mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">ขาย {sellCount}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">ซื้อ {buyCount}</span>
          </div>
          {event.available_distances && (
            <div className="text-xs text-gray-300 mt-2">ระยะ: {event.available_distances.join(' • ')}</div>
          )}
        </div>

        {/* Listings */}
        {(!listings || listings.length === 0) ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-500 text-sm">ยังไม่มีประกาศสำหรับงานนี้</div>
            <Link href="/create" className="inline-block mt-3 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold">ลงบิบ</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l: any) => {
              const includes: string[] = []
              if (l.includes_bib) includes.push(`บิบ${l.bib_gender ? ` (${l.bib_gender})` : ''}`)
              if (l.includes_shirt) includes.push(`เสื้อ${l.shirt_size ? ` ${l.shirt_size}` : ''}`)
              if (l.includes_finisher_shirt) includes.push(`Finisher${l.finisher_shirt_size ? ` ${l.finisher_shirt_size}` : ''}`)
              if (l.includes_medal) includes.push('เหรียญ')

              return (
                <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{l.distance} • {l.type === 'sell' ? 'ขาย' : 'ซื้อ'}</h3>
                      <div className="text-xs text-gray-400 mt-0.5">{l.users?.display_name}</div>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[130px]">
                      {includes.map(inc => <span key={inc} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>)}
                    </div>
                  </div>
                  {l.meetup_location && (
                    <div className="text-xs text-gray-400 mb-2">📍 นัดรับ: {l.meetup_location}</div>
                  )}
                  {l.note && <div className="text-xs text-gray-400 mb-2 italic">&quot;{l.note}&quot;</div>}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    {l.price_mode === 'open' ? (
                      <div className="text-xl font-extrabold text-blue-600">฿{l.asking_price?.toLocaleString()}</div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">ราคาซ่อน</span>
                    )}
                    <div className="text-xs text-gray-300">{new Date(l.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
