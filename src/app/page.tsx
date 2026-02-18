import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 60 // revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch real events from Supabase
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  // Fetch listing counts per event
  const { data: listingCounts } = await supabase
    .from('listings')
    .select('event_id, type')
    .eq('status', 'waiting')

  // Build count map
  const countMap: Record<string, { sell: number; buy: number }> = {}
  listingCounts?.forEach(l => {
    if (!countMap[l.event_id]) countMap[l.event_id] = { sell: 0, buy: 0 }
    countMap[l.event_id][l.type as 'sell' | 'buy']++
  })

  return (
    <div className="pb-24">
      <Header title="PloiBib | ปล่อยบิบ" />
      <div className="p-4 space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <h2 className="text-xl font-bold mb-1.5 relative">หาคนรับบิบแทน</h2>
          <p className="text-sm text-blue-100 mb-5 relative">อย่างปลอดภัยกว่าเดิม — ตลาดกลางสำหรับส่งต่อบิบงานวิ่ง</p>
          <div className="flex gap-3 relative">
            <Link href="/create" className="bg-white text-blue-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex-1 text-center shadow-lg shadow-blue-900/20 hover:bg-blue-50 transition">
              📤 ลงบิบของคุณ
            </Link>
            <Link href="/search" className="bg-white/15 backdrop-blur text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex-1 text-center hover:bg-white/25 transition border border-white/20">
              🔍 หาบิบ
            </Link>
          </div>
        </div>

        {/* Upcoming Events - from DB */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">งานไฟลนก้น 🏃</h2>
          </div>

          {(!events || events.length === 0) ? (
            <div className="text-center text-gray-400 py-8 text-sm">ยังไม่มีงานวิ่งในระบบ</div>
          ) : (
            <div className="space-y-3">
              {events.map((ev: any) => {
                const counts = countMap[ev.id] || { sell: 0, buy: 0 }
                const eventDate = new Date(ev.event_date)
                const thaiDate = eventDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                
                return (
                  <Link key={ev.id} href={`/event?id=${ev.id}`}
                    className="block w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-50 text-left hover:shadow-md hover:border-blue-100 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{ev.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span>{thaiDate}</span>
                          <span>•</span>
                          <span>{ev.province}</span>
                        </div>
                        {ev.venue && <div className="text-xs text-gray-300 mt-0.5">{ev.venue}</div>}
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-blue-600 font-extrabold text-lg">{counts.sell}</div>
                        <div className="text-[10px] text-gray-400">บิบพร้อมส่งต่อ</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">ขาย {counts.sell}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">ซื้อ {counts.buy}</span>
                      {ev.available_distances && (
                        <span className="text-[10px] text-gray-300 ml-auto">{ev.available_distances.join(' • ')}</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-gray-50 rounded-2xl p-5">
          <h2 className="font-bold text-gray-800 mb-4">วิธีใช้งาน</h2>
          <div className="space-y-4">
            {[
              { n: '1', t: 'ลงประกาศขาย/ซื้อ', d: 'เลือกแบบเปิดราคาหรือราคาซ่อน' },
              { n: '2', t: 'ระบบจับคู่อัตโนมัติ', d: 'เสนอราคากลางที่ยุติธรรมทั้งสองฝ่าย' },
              { n: '3', t: 'ตกลงราคา นัดเจอ ยืนยันดีล', d: 'ให้คะแนนสร้างความน่าเชื่อถือ' },
            ].map(s => (
              <div key={s.n} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{s.n}</div>
                <div><div className="font-semibold text-sm text-gray-800">{s.t}</div><div className="text-xs text-gray-400 mt-0.5">{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-center text-gray-300 pt-2">แพลตฟอร์มนี้เป็นเพียงตัวกลางในการจับคู่เท่านั้น ไม่รับรองสิทธิ์การแข่งขัน</p>
      </div>
    </div>
  )
}
