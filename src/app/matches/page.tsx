import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-server'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="pb-24">
        <Header title="แมทช์ของฉัน" />
        <div className="p-4 text-center py-16">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-gray-500 mb-4">เข้าสู่ระบบเพื่อดูแมทช์ของคุณ</p>
          <Link href="/login?redirect=/matches" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  // Fetch user's listings
  const { data: myListings } = await supabase
    .from('listings')
    .select('*, events ( name, event_date, province )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch user's matches
  const { data: myMatches } = await supabase
    .from('matches')
    .select('*, events:deals ( event_id )')
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const waiting = myListings?.filter(l => l.status === 'waiting') || []
  const matched = myListings?.filter(l => ['matching', 'matched'].includes(l.status)) || []
  const completed = myListings?.filter(l => l.status === 'completed') || []

  return (
    <div className="pb-24">
      <Header title="แมทช์ของฉัน" />
      <div className="p-4 space-y-6">

        {/* My Active Listings */}
        <div>
          <h2 className="font-bold text-gray-800 mb-3">ประกาศที่รออยู่ ({waiting.length})</h2>
          {waiting.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-400 text-sm">ยังไม่มีประกาศ</p>
              <Link href="/create" className="inline-block mt-3 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold">
                ลงบิบ
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {waiting.map((l: any) => {
                const ev = l.events
                const includes: string[] = []
                if (l.includes_bib) includes.push(`บิบ${l.bib_gender ? ` (${l.bib_gender})` : ''}`)
                if (l.includes_shirt) includes.push(`เสื้อ${l.shirt_size ? ` ${l.shirt_size}` : ''}`)
                if (l.includes_finisher_shirt) includes.push(`Finisher${l.finisher_shirt_size ? ` ${l.finisher_shirt_size}` : ''}`)
                if (l.includes_medal) includes.push('เหรียญ')

                return (
                  <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-blue-400">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-gray-800">{ev?.name || 'งานวิ่ง'} • {l.distance}</h3>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {l.type === 'sell' ? '📤 ขาย' : '🔍 ซื้อ'}
                          {l.meetup_location && ` • 📍 ${l.meetup_location}`}
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {includes.map(inc => (
                            <span key={inc} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        {l.price_mode === 'open' ? (
                          <div className="text-lg font-extrabold text-blue-600">฿{l.asking_price?.toLocaleString()}</div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">ราคาซ่อน</span>
                            <div className="text-xs text-gray-400 mt-0.5">฿{l.asking_price?.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        ⏳ กำลังรอจับคู่
                      </span>
                      <span className="text-[10px] text-gray-300">{new Date(l.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Matched */}
        {matched.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3">จับคู่แล้ว ({matched.length})</h2>
            <div className="space-y-3">
              {matched.map((l: any) => (
                <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-emerald-400">
                  <h3 className="font-bold text-sm">{l.events?.name} • {l.distance}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mt-2 inline-block">✅ จับคู่แล้ว</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-3">เสร็จแล้ว ({completed.length})</h2>
            <div className="space-y-3">
              {completed.map((l: any) => (
                <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-gray-300">
                  <h3 className="font-bold text-sm text-gray-500">{l.events?.name} • {l.distance}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 mt-2 inline-block">เสร็จสิ้น</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
