import React, { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  console.log('[Layout] Rendering with children:', children)
  console.log('[Layout] Children type:', typeof children)
  console.log('[Layout] Children props:', (children as { props?: unknown })?.props)

  return (
    <div className="w-full min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 grid grid-cols-[400px_1fr] gap-4 max-w-full m-0 p-0 h-[calc(100vh-120px)] lg:grid-cols-[400px_1fr] md:grid-cols-1 md:h-auto">
        <Sidebar />
        <main className="bg-card text-foreground rounded-[10px] p-4 shadow-md overflow-y-auto max-h-[calc(100vh-120px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
