'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase-client'

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(profileData)

      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      setStats(statsData)

      // Fetch user's active listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*, events ( name, event_date, province )')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(10)
      setListings(listingsData || [])

      setLoading(false)
    }
    if (userId) load()
  }, [userId])

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="โปรไฟล์" showBack />
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="pb-24">
        <Header title="โปรไฟล์" showBack />
        <div className="p-4 text-center py-16">
          <div className="text-5xl mb-4">❓</div>
          <p className="text-gray-500">ไม่พบผู้ใช้</p>
        </div>
      </div>
    )
  }

  const repScore = stats
    ? Math.min(100, Math.max(0, 50 + (stats.completed_deals * 5) - (stats.cancelled_deals * 15) - (stats.no_response_count * 10)))
    : 50
  const repLevel = repScore >= 81 ? 'highly_trusted' : repScore >= 56 ? 'trusted' : 'new'
  const repLabels: Record<string, { text: string; cls: string }> = {
    new: { text: 'ใหม่', cls: 'text-gray-400 bg-gray-50' },
    trusted: { text: 'Trusted', cls: 'text-blue-600 bg-blue-50' },
    highly_trusted: { text: 'Highly Trusted', cls: 'text-emerald-600 bg-emerald-50' },
  }
  const rep = repLabels[repLevel]
  const avgRating = stats && stats.rating_count > 0 ? (stats.total_rating_sum / stats.rating_count).toFixed(1) : null
  const memberSince = new Date(profile.created_at).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <div className="pb-24">
      <Header title={profile.display_name || 'โปรไฟล์'} showBack />
      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center mx-auto mb-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">🏃</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-800">{profile.display_name}</h2>
          <p className="text-gray-300 text-xs mt-0.5">สมาชิกตั้งแต่ {memberSince}</p>
          <div className="flex justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map(i => (
              <svg key={i} className={`w-4 h-4 ${avgRating && i <= Math.round(parseFloat(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span className="text-xs text-gray-400 ml-1">{avgRating ? `${avgRating} (${stats?.rating_count} รีวิว)` : 'ยังไม่มีรีวิว'}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rep.cls}`}>
            {repLevel !== 'new' && <span className={`w-1.5 h-1.5 rounded-full ${repLevel === 'highly_trusted' ? 'bg-emerald-500' : 'bg-blue-500'}`} />}
            {rep.text}
          </span>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3">สถิติ</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-extrabold text-blue-600">{stats?.completed_deals || 0}</div>
              <div className="text-[10px] text-gray-400">ดีลสำเร็จ</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-500">{repScore}</div>
              <div className="text-[10px] text-gray-400">คะแนน</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-500">{stats?.on_time_count || 0}</div>
              <div className="text-[10px] text-gray-400">ตรงเวลา</div>
            </div>
          </div>
        </div>

        {/* Active Listings */}
        {listings.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-gray-800 mb-3">ประกาศที่เปิดอยู่ ({listings.length})</h3>
            <div className="space-y-3">
              {listings.map((l: any) => {
                const ev = l.events
                const includes: string[] = []
                if (l.includes_bib) includes.push(`บิบ${l.bib_gender ? ` (${l.bib_gender})` : ''}`)
                if (l.includes_shirt) includes.push(`เสื้อ${l.shirt_size ? ` ${l.shirt_size}` : ''}`)
                if (l.includes_finisher_shirt) includes.push(`Finisher${l.finisher_shirt_size ? ` ${l.finisher_shirt_size}` : ''}`)
                if (l.includes_medal) includes.push('เหรียญ')
                if (l.includes_other) includes.push(l.includes_other)

                return (
                  <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{ev?.name} • {l.distance}</h4>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {includes.map(inc => <span key={inc} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{inc}</span>)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.type === 'sell' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {l.type === 'sell' ? 'ปล่อยบิบ' : 'ตั้งรับ'}
                        </span>
                        {l.price_mode === 'open' && (
                          <div className="text-lg font-extrabold text-blue-600 mt-1">฿{l.asking_price?.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    {l.type === 'sell' && (
                      <Link href={`/create?event=${ev?.id || l.event_id}&distance=${l.distance}&type=buy`}
                        className="block w-full mt-3 py-2 text-center bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                        สนใจ — ตั้งรับบิบนี้
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
