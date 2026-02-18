import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'PloiBib | ปล่อยบิบ',
  description: 'หาคนรับบิบแทน อย่างปลอดภัยกว่าเดิม',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-100 antialiased">
        <div className="flex justify-center min-h-screen">
          <div className="w-full max-w-md bg-gray-50 min-h-screen relative shadow-2xl shadow-gray-300/50">
            {children}
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  )
}
