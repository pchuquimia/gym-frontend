import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

function MainLayout({ children, activePage, onNavigate }) {
  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col">
      <div className="grid grid-cols-[260px_1fr] max-md:grid-cols-1 flex-1">
        <div className="hidden md:block">
          <Sidebar activePage={activePage} onNavigate={onNavigate} />
        </div>
        <div className="px-4 py-4 md:px-8 md:py-8">
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>
      <div className="md:hidden sticky bottom-0">
        <MobileNav activePage={activePage} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

export default MainLayout
