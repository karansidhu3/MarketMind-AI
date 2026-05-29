import type { Metadata } from 'next'
import { DM_Serif_Display } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'MarketMind', template: '%s — MarketMind' },
  description: 'Persistent investment intelligence, locally run.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSerif.variable}>
      <body className="min-h-screen bg-background text-text-primary font-sans antialiased transition-colors duration-200">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
