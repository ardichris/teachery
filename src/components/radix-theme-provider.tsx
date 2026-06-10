'use client'

import { Theme } from '@radix-ui/themes'
import { useTheme } from 'next-themes'
import * as React from 'react'

export function RadixThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { resolvedTheme } = useTheme()
  const appearance = resolvedTheme === 'dark' ? 'dark' : 'light'

  return (
    <Theme
      accentColor='blue'
      appearance={appearance}
      grayColor='slate'
      hasBackground={false}
      panelBackground='translucent'
      radius='medium'
      scaling='100%'
      className='min-h-screen bg-background text-foreground'>
      {children}
    </Theme>
  )
}
