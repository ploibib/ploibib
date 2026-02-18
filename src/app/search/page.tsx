import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 30

export default async function SearchPage() {
  const supabase = await createClient()

  // Fetch real listings with event info
  const { data: listings } = await supabase
    .from('listings')
    .select(`
      *,
      events ( name, event_date, province, venue ),
      users ( display_name )
    `)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch user stats for reputation
  const userIds = [...new Set(listings?.map(l => l.user_id) || [])]
  const { data: userStats } = userIds.length > 0
    ? await supabase.from('user_stats').select('*').in('user_id', userIds)
    : { data: [] }

  const statsMap: Record<string, any> = {}
  userStats?.forEach(s => { statsMap[s.user_id] = s })

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

  return (
    <div className="pb-24">
      <Header title="หาบิบ" showBack />
      <div className="p-4 space-y-4">

        {(!listings || listings.length === 0) ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-gray-500 font-medium">ยังไม่มีประกาศในระบบ</div>
            <div className="text-gray-400 text-sm mt-1">เป็นคนแรกที่ลงบิบ!</div>
            <Link href="/create" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
              📤 ลงบิบ
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l: any) => {
              const ev = l.events
              const stats = statsMap[l.user_id]
              const level = getRepLevel(stats)
              const rep = repLabels[level]
              const eventDate = ev ? new Date(ev.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''
              
              // Build includes list
              const includes: string[] = []
              if (l.includes_bib) includes.push(`บิบ${l.bib_gender ? ` (${l.bib_gender})` : ''}`)
              if (l.includes_shirt) includes.push(`เสื้อ${l.shirt_size ? ` ${l.shirt_size}` : ''}`)
              if (l.includes_finisher_shirt) includes.push(`Finisher${l.finisher_shirt_size ? ` ${l.finisher_shirt_size}` : ''}`)
              if (l.includes_medal) includes.push('เหรียญ')

              return (
                <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">
                        {ev?.name || 'งานวิ่ง'} • {l.distance}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <span>{eventDate}</span>
                        {ev?.province && <><span>•</span><span>{ev.province}</span></>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${rep.cls}`}>
                          {level !== 'new' && <span className={`w-1.5 h-1.5 rounded-full ${level === 'highly_trusted' ? 'bg-emerald-500' : 'bg-blue-500'}`} />}
                          {rep.text}
                        </span>
                        <span className="text-xs text-gray-400">{l.users?.display_name}</span>
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

                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.type === 'sell' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                      {l.type === 'sell' ? 'ขาย' : 'ซื้อ'}
                    </span>
                    {l.price_mode === 'open' ? (
                      <div className="text-xl font-extrabold text-blue-600">฿{l.asking_price?.toLocaleString()}</div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">ราคาซ่อน</span>
                    )}
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
