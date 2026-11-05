import { useEffect, useState } from 'react'
import { adminApi } from '../lib/adminApi'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, MapPin, UserRound, CalendarCheck, LogOut, CarFront } from 'lucide-react'
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
  const [driver, setDriver] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const { pathname } = useLocation()
  const bookingReturnQuery = pathname === '/travel-details' ? `?returnTo=${encodeURIComponent('/travel-details')}` : ''

  useEffect(() => {
    let active = true
    setCheckingSession(true)
    const driverRoute = pathname.startsWith('/driver')
    const checkSession = async () => {
      if (driverRoute) {
        try {
          const result = await adminApi.driverMe()
          if (active) { setDriver(result.driver || null); setPassenger(null) }
        } catch {
          if (active) { setDriver(null); setPassenger(null) }
        }
      } else {
        try {
          const result = await adminApi.passengerMe()
          if (active) { setPassenger(result.user || null); setDriver(null) }
        } catch {
          try {
            const result = await adminApi.driverMe()
            if (active) { setDriver(result.driver || null); setPassenger(null) }
          } catch {
            if (active) { setPassenger(null); setDriver(null) }
          }
        }
      }
      if (active) setCheckingSession(false)
    }
    checkSession()
    return () => { active = false }
  }, [pathname])

  async function logout() {
    setLoggingOut(true)
    try {
      if (driver) await adminApi.driverLogout()
      else await adminApi.passengerLogout()
    } catch (error) {
      console.error('Unable to log out:', error)
    } finally {
      setPassenger(null)
      setDriver(null)
      setLoggingOut(false)
      setAuthOpen(false)
      setProfileOpen(false)
      setMenuOpen(false)
    }
  }
  const pages = useCmsNavigation()
  const navigationPages = pages.filter(page => !['terms-and-conditions', 'privacy-policy'].includes(page.slug))
  const navigation = [{label:'Home',to:'/'},...(navigationPages.length ? navigationPages.map(page=>({label:page.navLabel,to:'/'+page.slug})) : fallbackNavigation)]

  return (
    <header className="relative z-30 border-b border-slate-100 bg-white">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:min-h-[80px] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="shrink-0 rounded-lg border border-slate-200 p-2 text-wayz-navy md:hidden">{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
          <Brand />
        </div>
        <nav aria-label="Main navigation" className="mx-4 hidden flex-1 items-center justify-center gap-6 text-sm md:flex lg:gap-8">
          {navigation.map((item) => {
            const active = pathname === item.to
            return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={navClass(active)}>{item.label}</Link>
          })}
        </nav>
        <div className="relative hidden h-12 w-44 shrink-0 items-center justify-end md:flex">
          {checkingSession ? <div aria-hidden="true" className="h-12 w-36 rounded-xl bg-slate-100"/> : ((driver || passenger) ? (
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen(open => !open)} aria-expanded={profileOpen} aria-haspopup="menu" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-wayz-blue hover:bg-blue-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-wayz-blue"><UserRound size={16}/></span>
                <span className="max-w-36 truncate">{driver?.name || passenger?.name}</span>
                <ChevronDown size={15} className={profileOpen ? 'rotate-180 transition-transform' : 'transition-transform'}/>
              </button>
              {profileOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                {driver ? <Link role="menuitem" onClick={() => setProfileOpen(false)} to="/driver" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-wayz-blue"><CarFront size={17}/> Driver dashboard</Link> : <><Link role="menuitem" onClick={() => setProfileOpen(false)} to="/my-profile" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-wayz-blue"><UserRound size={17}/> My Profile</Link><Link role="menuitem" onClick={() => setProfileOpen(false)} to="/my-bookings" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-wayz-blue"><CalendarCheck size={17}/> My Bookings</Link></>}
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
      </div>
      <button type="button" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-300 md:hidden ${menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} />
      <nav aria-label="Mobile navigation" aria-hidden={!menuOpen} className={`fixed inset-y-0 left-0 z-50 w-[min(84vw,340px)] flex flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white px-4 pb-6 pt-4 text-sm shadow-2xl transition-transform duration-300 ease-out md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <Brand />
          <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 p-2 text-wayz-navy"><X size={20}/></button>
        </div>
        {navigation.map((item) => {
          const active = pathname === item.to
          return <Link key={item.to} onClick={() => setMenuOpen(false)} to={item.to} aria-current={active ? 'page' : undefined} className={`rounded-lg px-3 py-3 transition ${active ? 'bg-blue-50 font-bold text-wayz-blue' : 'font-semibold text-slate-700 hover:bg-wayz-mist'}`}>{item.label}</Link>
        })}
        {checkingSession ? <div aria-hidden="true" className="mx-3 mt-2 h-10 rounded-lg bg-slate-100"/> : ((driver || passenger) ? (
          <div className="border-t border-slate-100 pt-3">
            <p className="px-3 py-2 text-sm font-semibold text-slate-700">Signed in as {driver?.name || passenger?.name}</p>
            {driver ? <Link onClick={() => setMenuOpen(false)} to="/driver" className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 hover:bg-blue-50"><CarFront size={17}/> Driver dashboard</Link> : <><Link onClick={() => setMenuOpen(false)} to="/my-profile" className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 hover:bg-blue-50"><UserRound size={17}/> My Profile</Link><Link onClick={() => setMenuOpen(false)} to="/my-bookings" className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-700 hover:bg-blue-50"><CalendarCheck size={17}/> My Bookings</Link></>}
            <button type="button" onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-rose-600 hover:bg-rose-50 disabled:opacity-60"><LogOut size={17}/>{loggingOut ? 'Logging out…' : 'Logout'}</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 pt-2"><Link onClick={() => setMenuOpen(false)} to={`/login${bookingReturnQuery}`} className="rounded-xl bg-wayz-blue px-4 py-3 text-center text-white">Login</Link><Link onClick={() => setMenuOpen(false)} to={`/register${bookingReturnQuery}`} className="rounded-xl border border-wayz-blue px-4 py-3 text-center text-wayz-blue">Register</Link></div>
            <Link onClick={() => setMenuOpen(false)} to="/driver/register" className="rounded-lg px-3 py-3 text-wayz-blue">Register as an auto driver</Link>
          </>
        ))}

      </nav>
    </header>
  )
}

export function SiteFooter() {
  const pages = useCmsNavigation()
  const fallbackFooterPages = [{slug:'about',footerLabel:'About 2WAYZ'},{slug:'how-it-works',footerLabel:'How it works'},{slug:'drivers',footerLabel:'For drivers'},{slug:'contact',footerLabel:'Contact'},{slug:'terms-and-conditions',footerLabel:'Terms and Conditions'},{slug:'privacy-policy',footerLabel:'Privacy Policy'}]
  const footerPages = [...fallbackFooterPages.map(fallback => pages.find(page => page.slug === fallback.slug) || fallback), ...pages.filter(page => !fallbackFooterPages.some(fallback => fallback.slug === page.slug))]
  return (
    <footer id="contact" className="bg-[#052f6c] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8"><div><Brand light/><p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">Your local mobility partner in Tiruvannamalai. Ride local. Reach easy.</p></div><div><h3 className="font-bold">Explore</h3><div className="mt-4 grid gap-3 text-sm text-blue-100">{footerPages.map(page=><Link key={page.slug} to={'/'+page.slug} className="hover:text-wayz-yellow">{page.footerLabel}</Link>)}</div></div><div><h3 className="font-bold">Get in touch</h3><p className="mt-4 text-sm text-blue-100">Tiruvannamalai, Tamil Nadu</p><p className="mt-3 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin size={16}/> Tiruvannamalai, Tamil Nadu</p></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-blue-200 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} 2WAYZ. All rights reserved.</span><span>Local mobility. Made simple.</span></div></div></footer>
  )
}
