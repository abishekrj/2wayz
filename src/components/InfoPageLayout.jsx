import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SiteHeader, SiteFooter } from './SiteChrome'

export default function InfoPageLayout({ eyebrow, title, intro, children, ctaLabel, ctaTo = '/login' }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <section className="bg-wayz-navy text-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-yellow">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">{intro}</p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">{children}
          {ctaLabel && <div className="mt-12 rounded-3xl bg-wayz-mist p-8 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><h2 className="text-xl font-extrabold text-wayz-ink">Ready to get started with 2WAYZ?</h2><p className="mt-2 text-sm text-slate-600">Choose the next step that works for you.</p></div><Link to={ctaTo} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-5 py-3 text-sm font-bold text-wayz-ink sm:mt-0">{ctaLabel}<ArrowRight size={17}/></Link></div>}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
