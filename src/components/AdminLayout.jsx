import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Home, CarFront, ChevronDown, ChevronRight, LogOut, Menu, X, FileEdit, Files } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const homeSections = [
  ['hero-banner', 'Hero Banner'],
  ['benefits', 'Benefits'],
  ['darshan-promo', 'Darshan Promo Banner'],
  ['nearby-places', 'Places to Visit'],
  ['upcoming-events', 'Upcoming Events']
]

const defaultCmsPages = [
  { slug: 'about', navLabel: 'About' },
  { slug: 'how-it-works', navLabel: 'How it works' },
  { slug: 'drivers', navLabel: 'For drivers' },
  { slug: 'contact', navLabel: 'Contact' }
]

const submenuClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`

export default function AdminLayout({ admin }) {
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmsPages, setCmsPages] = useState(defaultCmsPages)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    adminApi.pages()
      .then(data => {
        if (mounted && Array.isArray(data.pages) && data.pages.length) {
          setCmsPages(data.pages)
        }
      })
      .catch(error => console.error('Unable to load CMS page menu:', error))
    return () => { mounted = false }
  }, [])

  async function logout() {
    try { await adminApi.logout() } finally { navigate('/admin/login', { replace: true }) }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#082f68] text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-xl font-extrabold tracking-wide">2WAYZ <span className="text-wayz-yellow">ADMIN</span></p>
        <p className="mt-1 text-xs text-blue-200">Website management</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        <NavLink end to="/admin/dashboard" onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10'}`}>
          <LayoutDashboard size={18} />Dashboard
        </NavLink>

        <NavLink to="/admin/registered-users" onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"}`}>
          <Users size={18} />Registered Users
        </NavLink>

        <NavLink to="/admin/drivers" onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"}`}>
          <CarFront size={18} />Registered Drivers
        </NavLink>

        <section>
          <button type="button" onClick={() => setOpenSubmenu(value => value === 'home' ? null : 'home')} aria-expanded={openSubmenu === 'home'} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-blue-100 hover:bg-white/10">
            <span className="flex items-center gap-3"><Home size={18} />Home Page</span>
            {openSubmenu === 'home' ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
          {openSubmenu === 'home' && (
            <div className="ml-3 mt-1 space-y-1 border-l border-white/15 pl-3">
              {homeSections.map(([slug, title]) => (
                <NavLink key={slug} to={`/admin/home-page/${slug}`} onClick={() => setMobileOpen(false)} className={submenuClass}>
                  <FileEdit size={14} />{title}
                </NavLink>
              ))}
            </div>
          )}
        </section>

        <section>
          <button type="button" onClick={() => setOpenSubmenu(value => value === 'cms' ? null : 'cms')} aria-expanded={openSubmenu === 'cms'} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-blue-100 hover:bg-white/10">
            <span className="flex items-center gap-3"><Files size={18} />CMS Pages</span>
            {openSubmenu === 'cms' ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
          {openSubmenu === 'cms' && (
            <div className="ml-3 mt-1 space-y-1 border-l border-white/15 pl-3">
              {cmsPages.map(page => (
                <NavLink key={page.slug} to={`/admin/cms-pages/${page.slug}`} onClick={() => setMobileOpen(false)} className={submenuClass}>
                  <FileEdit size={14} />{page.navLabel || page.title || page.slug}
                </NavLink>
              ))}
            </div>
          )}
        </section>
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold">{admin?.name}</p>
        <p className="truncate text-xs text-blue-200">{admin?.email}</p>
        <button onClick={logout} className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-100 hover:bg-white/10">
          <LogOut size={16} />Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-72 shrink-0 lg:fixed lg:inset-y-0 lg:block">{sidebar}</aside>
      <div className="min-w-0 flex-1 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button>
          <p className="text-sm font-semibold text-slate-700">Super Admin Portal</p>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-wayz-blue">Super Admin</span>
        </header>
        <main className="p-4 sm:p-7 lg:p-9"><Outlet /></main>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw]">
            {sidebar}
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-white" aria-label="Close menu"><X /></button>
          </aside>
        </div>
      )}
    </div>
  )
}
