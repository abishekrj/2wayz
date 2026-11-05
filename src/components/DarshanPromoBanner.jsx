import { ArrowUpRight, CalendarCheck, Landmark, Sparkles } from 'lucide-react'

const DARSHAN_URL = 'https://hrce.tn.gov.in/intrahrce/login'

export default function DarshanPromoBanner() {
  return (
    <section aria-labelledby="darshan-promo-heading" className="bg-wayz-mist/60 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#073B83] px-6 py-8 text-white shadow-card sm:px-10 sm:py-10 lg:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[36px] border-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/4 h-64 w-64 rounded-full border-[28px] border-white/5" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold tracking-[.16em] text-blue-100 sm:text-xs">
                <Sparkles size={14} className="text-wayz-yellow" />
                YOUR SPIRITUAL VISIT STARTS HERE
              </span>
              <h2 id="darshan-promo-heading" className="mt-4 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                Planning a visit to Arunachaleswarar Temple?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Get started with your Darshan ticket booking through the Tamil Nadu Hindu Religious & Charitable Endowments Department portal. Plan your visit with greater peace of mind.
              </p>
              <p className="mt-3 text-xs text-blue-200">
                You’ll be redirected to the official HR&CE website to continue.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-wayz-yellow lg:flex">
                <Landmark size={34} strokeWidth={1.7} />
              </div>
              <a
                href={DARSHAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-bold text-wayz-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-300 focus:outline-none focus:ring-4 focus:ring-yellow-200/40 sm:w-auto"
              >
                <CalendarCheck size={19} />
                Book Darshan Tickets
                <ArrowUpRight size={18} />
              </a>
              <span className="text-[11px] text-blue-200">Opens in a new tab</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
