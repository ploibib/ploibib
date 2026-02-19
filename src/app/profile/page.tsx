'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
      if (profileData?.avatar_url) setAvatarUrl(profileData.avatar_url)

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setStats(statsData)

      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate size (1MB)
    if (file.size > 1048576) {
      alert('ไฟล์ใหญ่เกินไป (สูงสุด 1MB)')
      return
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('รองรับเฉพาะไฟล์ JPG, PNG, WEBP')
      return
    }

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert('อัพโหลดไม่สำเร็จ: ' + uploadError.message)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Add cache buster
    const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`

    // Update user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlWithCacheBuster })
      .eq('id', user.id)

    if (updateError) {
      alert('อัปเดตโปรไฟล์ไม่สำเร็จ: ' + updateError.message)
    } else {
      setAvatarUrl(urlWithCacheBuster)
    }

    setUploading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="โปรไฟล์" />
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400 text-sm">กำลังโหลด...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="pb-24">
        <Header title="โปรไฟล์" />
        <div className="p-4 text-center py-16">
          <div className="text-5xl mb-4">👤</div>
          <p className="text-gray-500 mb-4">เข้าสู่ระบบเพื่อดูโปรไฟล์ของคุณ</p>
          <Link href="/login?redirect=/profile" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
            เข้าสู่ระบบ
          </Link>
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
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
  const memberSince = new Date(user.created_at).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })

  return (
    <div className="pb-24">
      <Header title="โปรไฟล์" />
      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          {/* Avatar with upload */}
          <div className="relative inline-block mb-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center cursor-pointer group relative"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🏃</span>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Camera badge */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-700 transition"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
          </div>

          <h2 className="text-lg font-bold text-gray-800">{displayName}</h2>
          <p className="text-gray-400 text-xs">{user.email}</p>
          <p className="text-gray-300 text-[10px] mt-0.5">สมาชิกตั้งแต่ {memberSince}</p>
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
              <div className="text-2xl font-extrabold text-gray-300">{stats?.cancelled_deals || 0}</div>
              <div className="text-[10px] text-gray-400">ยกเลิก</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-500">{repScore}</div>
              <div className="text-[10px] text-gray-400">คะแนน</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link href="/matches" className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition text-sm border-b border-gray-50">
            <span>📋 ประกาศของฉัน</span><span className="text-gray-300">→</span>
          </Link>
          <Link href="/search" className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition text-sm">
            <span>🔍 หาบิบ</span><span className="text-gray-300">→</span>
          </Link>
        </div>

        <button onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-red-200 text-red-400 font-semibold text-sm hover:bg-red-50 transition">
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
