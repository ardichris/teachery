'use client'

import Header from './layout/header/Header'
import Sidebar from './layout/sidebar/Sidebar'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className='flex w-full min-h-screen bg-background'>
      <div className='page-wrapper flex w-full'>
        <div className='xl:block hidden'>
          <Sidebar />
        </div>
        <div className='body-wrapper w-full bg-background'>
          <Header />
          <main className='container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
            {children}
          </main>
        </div>
      </div>
      
    </div>
  )
}
