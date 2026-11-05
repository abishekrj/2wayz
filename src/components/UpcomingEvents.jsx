import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Flame, PartyPopper } from 'lucide-react'

const events = [
  {
    id: 'karthigai-deepam-2026',
    title: 'Karthigai Deepam',
    subtitle: 'The festival of lights at sacred Arunachala',
    date: '2026-11-24T00:00:00+05:30',
    dateLabel: '24 November 2026',
    timeLabel: 'Countdown to 24 November',
    icon: Flame,
    accent: 'from-orange-500 to-rose-600',
  },
  {
    id: 'new-year-2027',
    title: 'New Year 2027',
    subtitle: 'Welcome the new year with fresh beginnings',
    date: '2027-01-01T00:00:00+05:30',
    dateLabel: '1 January 2027',
    timeLabel: 'Countdown to 1 January',
    icon: PartyPopper,
    accent: 'from-blue-600 to-indigo-700',
  },
]

function getRemaining(target, now) {
  const total = Math.max(0, target - now)
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
    finished: target <= now,
  }
}

export default function UpcomingEvents() {
  const [active, setActive] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const event = events[active]
  const Icon = event.icon
  const remaining = getRemaining(new Date(event.date).getTime(), now)
  const previous = () => setActive(index => (index - 1 + events.length) % events.length)
  const next = () => setActive(index => (index + 1) % events.length)

  return (
    <section aria-labelledby="upcoming-events-heading" className="bg-wayz-mist/70 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">Mark your calendar</p>
            <h2 id="upcoming-events-heading" className="mt-2 text-3xl font-bold text-wayz-ink sm:text-4xl">Upcoming Events</h2>
            <p className="mt-2 text-sm text-slate-500">Important celebrations and dates around the year.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-xs font-semibold text-slate-500">{active + 1} of {events.length}</span>
            <button type="button" onClick={previous} aria-label="Previous event" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-wayz-blue shadow-sm transition hover:border-wayz-blue hover:bg-blue-50"><ChevronLeft size={19}/></button>
            <button type="button" onClick={next} aria-label="Next event" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-wayz-blue shadow-sm transition hover:border-wayz-blue hover:bg-blue-50"><ChevronRight size={19}/></button>
          </div>
        </div>

        <article key={event.id} className="mt-7 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70">
          <div className={`relative bg-gradient-to-r ${event.accent} px-6 py-8 text-white sm:px-9 sm:py-10`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10"/>
            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"><CalendarDays size={14}/>{event.dateLabel}</span>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Icon size={25}/></span>
                  <h3 className="text-2xl font-bold sm:text-3xl">{event.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/85">{event.subtitle}</p>
              </div>
              <div className="min-w-0 md:min-w-[390px]">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-white/85"><Clock3 size={15}/>{remaining.finished ? 'The event date has arrived' : event.timeLabel}</p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    ['Days', remaining.days],
                    ['Hours', remaining.hours],
                    ['Minutes', remaining.minutes],
                    ['Seconds', remaining.seconds],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/20 bg-white/10 px-2 py-3 text-center backdrop-blur-sm">
                      <p className="text-2xl font-black tabular-nums sm:text-3xl">{String(value).padStart(2, '0')}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/75">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-white/70">Countdown uses India Standard Time (IST).</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
            <div className="flex gap-1.5" aria-label="Choose event">
              {events.map((item, index) => <button key={item.id} type="button" onClick={() => setActive(index)} aria-label={`Show ${item.title}`} aria-current={active === index ? 'true' : undefined} className={`h-2 rounded-full transition-all ${active === index ? 'w-7 bg-wayz-blue' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}/>)}
            </div>
            <span className="text-xs font-semibold text-slate-500">Swipe-free browsing · Use arrows to explore</span>
          </div>
        </article>
      </div>
    </section>
  )
}
