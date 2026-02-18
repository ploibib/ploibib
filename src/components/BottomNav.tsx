'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'หน้าแรก', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/search', label: 'หาบิบ', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/create', label: 'ลงบิบ', d: 'M12 4v16m8-8H4' },
  { href: '/matches', label: 'แมทช์', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { href: '/profile', label: 'โปรไฟล์', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-lg border-t border-gray-100 px-2 py-1.5 flex justify-around z-50">
      {tabs.map(t => {
        const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={t.d} />
            </svg>
            <span className="text-[10px] mt-0.5 font-medium">{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
