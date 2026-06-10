import React from 'react'
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import '@radix-ui/themes/styles.css'
import './css/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { RadixThemeProvider } from '@/components/radix-theme-provider'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Teachery',
  description: 'Assessment Manager untuk guru.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <html lang='id' suppressHydrationWarning>
      <head>
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5d87ff" />
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </head>
      <body className={`${dmSans.className}`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange>
          <RadixThemeProvider>{children}</RadixThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
