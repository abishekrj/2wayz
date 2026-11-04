import { useEffect, useState } from 'react'
import { adminApi } from '../lib/adminApi'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, MapPin, UserRound, CalendarCheck, LogOut } from 'lucide-react'
import Brand from './Brand'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
const NAV_CACHE_KEY = 'twoWayz.publicNavigation.v1'
function readNavigationCache() {
  try { return JSON.parse(sessionStorage.getItem(NAV_CACHE_KEY) || '[]') } catch { return [] }
}
function useCmsNavigation() {
  const [pages,setPages] = useState(readNavigationCache)
  useEffect(() => {
    let active=true
    fetch(API_BASE + '/cms-pages/public')
      .then(r=>{if(!r.ok)throw new Error('Navigation unavailable');return r.json()})
      .then(data=>{if(active){const next=data.pages||[];setPages(next);try{sessionStorage.setItem(NAV_CACHE_KEY,JSON.stringify(next))}catch{}}})
      .catch(()=>{})
    return()=>{active=false}
  }, [])
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [passenger, setPassenger] = useState(null)
  const [checkingPassenger, setCheckingPassenger] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const { pathname } = useLocation()
  const bookingReturnQuery = pathname === '/travel-details' ? `?returnTo=${encodeURIComponent('/travel-details')}` : ''

  useEffect(() => {
    let active = true
    adminApi.passengerMe()
      .then(result => { if (active) setPassenger(result.user || null) })
      .catch(() => { if (active) setPassenger(null) })
      .finally(() => { if (active) setCheckingPassenger(false) })
    return () => { active = false }
  }, [])

  async function logout() {
    setLoggingOut(true)
    try {
      await adminApi.passengerLogout()
    } catch (error) {
      console.error('Unable to log out passenger:', error)
    } finally {
      setPassenger(null)
      setLoggingOut(false)
      setAuthOpen(false)
      setMenuOpen(false)
    }
  }
  const pages = useCmsNavigation()
  const navigation = [{label:'Home',to:'/'},...(pages.length ? pages.map(page=>({label:page.navLabel,to:'/'+page.slug})) : fallbackNavigation)]

  return (
    <header className="relative z-30 border-b border-slate-100 bg-white">
      <div className="mx-auto flex min-h-[80px] max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Brand />
        <nav aria-label="Main navigation" className="mx-4 hidden flex-1 items-center justify-center gap-6 text-sm md:flex lg:gap-8">
          {navigation.map((item) => {
            const active = pathname === item.to
            return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navClass(active)}>{item.label}</Link>
          })}
        </nav>
        <div className="relative hidden h-12 w-44 shrink-0 items-center justify-end md:flex">
          {checkingPassenger ? <div aria-hidden="true" className="h-12 w-36 rounded-xl bg-slate-100"/> : (passenger ? (
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen(open => !open)} aria-expanded={profileOpen} aria-haspopup="menu" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-wayz-blue hover:bg-blue-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-wayz-blue"><UserRound size={16}/></span>
                <span className="max-w-36 truncate">{passenger.name}</span>
                <ChevronDown size={15} className={profileOpen ? 'rotate-180 transition-transform' : 'transition-transform'}/>
              </button>
              {profileOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                <Link role="menuitem" onClick={() => setProfileOpen(false)} to="/my-profile" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-wayz-blue"><UserRound size={17}/> My Profile</Link>
                <Link role="menuitem" onClick={() => setProfileOpen(false)} to="/my-bookings" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-wayz-blue"><CalendarCheck size={17}/> My Bookings</Link>
                <button role="menuitem" type="button" onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"><LogOut size={17}/>{loggingOut ? 'Logging out…' : 'Logout'}</button>
              </div>}
            </div>
          ) : (
            <>
              <button onClick={() => setAuthOpen(!authOpen)} aria-expanded={authOpen} className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wayz-navy">Login / Sign up <ChevronDown className="ml-1 inline" size={15}/></button>
              {authOpen && <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl"><Link onClick={() => setAuthOpen(false)} to={`/login${bookingReturnQuery}`} className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Login</Link><Link onClick={() => setAuthOpen(false)} to={`/register${bookingReturnQuery}`} className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Create account</Link><Link onClick={() => setAuthOpen(false)} to="/driver/register" className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-wayz-blue">Register as driver</Link></div>}
            </>
          ))}
        </div>
        <button aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 p-2 text-wayz-navy md:hidden">{menuOpen ? <X/> : <Menu/>}</button>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 text-sm md:hidden">
        {navigation.map((item) => {
          const active = pathname === item.to
          return <Link key={item.to} onClick={() => setMenuOpen(false)} to={item.to} aria-current={active ? 'page' : undefined} className={`rounded-lg px-3 py-3 transition ${active ? 'bg-blue-50 font-bold text-wayz-blue' : 'font-semibold text-slate-700 hover:bg-wayz-mist'}`}>{item.label}</Link>
        })}
        {checkingPassenger ? <div aria-hidden="true" className="mx-3 mt-2 h-10 rounded-lg bg-slate-100"/> : (passenger ? (
          <div className="border-t border-slate-100 pt-3">
            <p className="px-3 py-2 text-sm font-semibold text-slate-700">Signed in as {passenger.name}</p>
            <Link onClick={() => setMenuOpen(false)} to="/my-profile" className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 hover:bg-blue-50"><UserRound size={17}/> My Profile</Link>
            <Link onClick={() => setMenuOpen(false)} to="/my-bookings" className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 hover:bg-blue-50"><CalendarCheck size={17}/> My Bookings</Link>
            <button type="button" onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-rose-600 hover:bg-rose-50 disabled:opacity-60"><LogOut size={17}/>{loggingOut ? 'Logging out…' : 'Logout'}</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 pt-2"><Link onClick={() => setMenuOpen(false)} to={`/login${bookingReturnQuery}`} className="rounded-xl bg-wayz-blue px-4 py-3 text-center text-white">Login</Link><Link onClick={() => setMenuOpen(false)} to={`/register${bookingReturnQuery}`} className="rounded-xl border border-wayz-blue px-4 py-3 text-center text-wayz-blue">Register</Link></div>
            <Link onClick={() => setMenuOpen(false)} to="/driver/register" className="rounded-lg px-3 py-3 text-wayz-blue">Register as an auto driver</Link>
          </>
        ))}
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
