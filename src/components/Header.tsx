'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

export default function Header({ title, showBack, right }: { title: string; showBack?: boolean; right?: ReactNode }) {
  const router = useRouter()
  return (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4 flex items-center gap-3 shadow-lg shadow-blue-600/10">
      {showBack && (
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-white/10 transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <h1 className="text-lg font-bold flex-1 tracking-tight">{title}</h1>
      {right}
    </div>
  )
}
