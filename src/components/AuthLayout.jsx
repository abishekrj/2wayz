import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Brand from './Brand'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Brand />
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-wayz-blue"><ArrowLeft size={16} /> Back to home</Link>
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:py-14">
        <section className="hidden min-h-[610px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#073b83] p-10 text-white shadow-xl lg:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-blue-100"><ShieldCheck size={15} /> LOCAL RIDES. TRUSTED CONNECTIONS.</span>
            <h1 className="mt-10 max-w-lg text-5xl font-extrabold leading-[1.12]">Your town.<br />Your ride.<br /><span className="text-wayz-yellow">Your 2WAYZ.</span></h1>
            <p className="mt-6 max-w-md text-base leading-7 text-blue-100">Book a local auto or join our driver community. Simple journeys start here in Tiruvannamalai.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5"><p className="text-sm font-semibold">Built around local travel</p><p className="mt-1 text-sm leading-6 text-blue-100">A simple way for passengers and local auto drivers to connect.</p></div>
        </section>
        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,42,80,.08)] sm:p-9">
            <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Welcome to 2WAYZ</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-wayz-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p></div>
            {children}
            {footer && <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">{footer}</div>}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} 2WAYZ. All rights reserved.</p>
        </section>
      </div>
    </main>
  )
}