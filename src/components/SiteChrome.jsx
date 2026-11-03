import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, MapPin } from 'lucide-react'
import Brand from './Brand'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
function useCmsNavigation() {
  const [pages,setPages] = useState([])
  useEffect(() => { let active=true; fetch(API_BASE + '/cms-pages/public').then(r=>r.json()).then(data=>{if(active)setPages(data.pages||[])}).catch(()=>{}); return()=>{active=false} }, [])
  return pages
}
const fallbackNavigation = [{ label: 'About', to: '/about' },{ label: 'How it works', to: '/how-it-works' },{ label: 'For drivers', to: '/drivers' },{ label: 'Contact', to: '/contact' }]

function navClass(active) {
  return active
    ? 'font-bold text-wayz-blue'
    : 'font-semibold text-slate-700 transition hover:text-wayz-blue'
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { pathname } = useLocation()
  const pages = useCmsNavigation()
  const navigation = [{label:'Home',to:'/'},...(pages.length ? pages.map(page=>({label:page.navLabel,to:'/'+page.slug})) : fallbackNavigation)]

  return (
    <header className="relative z-30 border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm md:flex">
          {navigation.map((item) => {
            const active = pathname === item.to
            return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navClass(active)}>{item.label}</Link>
          })}
        </nav>
        <div className="relative hidden md:block">
          <button onClick={() => setAuthOpen(!authOpen)} aria-expanded={authOpen} className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wayz-navy">Login / Sign up <ChevronDown className="ml-1 inline" size={15}/></button>
          {authOpen && <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl"><Link onClick={() => setAuthOpen(false)} to="/login" className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Login</Link><Link onClick={() => setAuthOpen(false)} to="/register" className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Create account</Link><Link onClick={() => setAuthOpen(false)} to="/driver/register" className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Register as driver</Link></div>}
        </div>
        <button aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 p-2 text-wayz-navy md:hidden">{menuOpen ? <X/> : <Menu/>}</button>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 text-sm md:hidden">
        {navigation.map((item) => {
          const active = pathname === item.to
          return <Link key={item.to} onClick={() => setMenuOpen(false)} to={item.to} aria-current={active ? 'page' : undefined} className={`rounded-lg px-3 py-3 transition ${active ? 'bg-blue-50 font-bold text-wayz-blue' : 'font-semibold text-slate-700 hover:bg-wayz-mist'}`}>{item.label}</Link>
        })}
        <div className="grid grid-cols-2 gap-2 pt-2"><Link onClick={() => setMenuOpen(false)} to="/login" className="rounded-xl bg-wayz-blue px-4 py-3 text-center text-white">Login</Link><Link onClick={() => setMenuOpen(false)} to="/register" className="rounded-xl border border-wayz-blue px-4 py-3 text-center text-wayz-blue">Register</Link></div>
        <Link onClick={() => setMenuOpen(false)} to="/driver/register" className="rounded-lg px-3 py-3 text-wayz-blue">Register as an auto driver</Link>
      </nav>}
    </header>
  )
}

export function SiteFooter() {
  const pages = useCmsNavigation()
  const footerPages = pages.length ? pages : [{slug:'about',footerLabel:'About 2WAYZ'},{slug:'how-it-works',footerLabel:'How it works'},{slug:'drivers',footerLabel:'For drivers'},{slug:'contact',footerLabel:'Contact'}]
  return (
    <footer id="contact" className="bg-[#052f6c] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8"><div><Brand light/><p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">Your local mobility partner in Tiruvannamalai. Ride local. Reach easy.</p></div><div><h3 className="font-bold">Explore</h3><div className="mt-4 grid gap-3 text-sm text-blue-100">{footerPages.map(page=><Link key={page.slug} to={'/'+page.slug} className="hover:text-wayz-yellow">{page.footerLabel}</Link>)}</div></div><div><h3 className="font-bold">Get in touch</h3><p className="mt-4 text-sm text-blue-100">Tiruvannamalai, Tamil Nadu</p><p className="mt-3 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin size={16}/> Tiruvannamalai, Tamil Nadu</p></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-blue-200 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} 2WAYZ. All rights reserved.</span><span>Local mobility. Made simple.</span></div></div></footer>
  )
}
