import { useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { ConceptPage } from '@/components/layout/ConceptPage'
import { Home } from '@/components/layout/Home'
import { useTheme } from '@/hooks/useTheme'

export function App() {
  const { theme, toggle } = useTheme()
  const [drawer, setDrawer] = useState(false)
  return (
    <HashRouter>
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 border-r border-line bg-panel lg:block">
          <Sidebar />
        </aside>
        {drawer && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setDrawer(false)}>
            <div className="h-full w-72 border-r border-line bg-panel" onClick={(e) => e.stopPropagation()}>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5 lg:justify-end">
            <button className="rounded-md border border-line px-2 py-1 text-xs lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">☰ Concepts</button>
            <button className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
          <main className="min-h-0 flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/c/:id" element={<ConceptPage />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}
