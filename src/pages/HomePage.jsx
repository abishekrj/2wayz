import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, MapPin, ShieldCheck, Wallet,
  Clock3, CalendarDays, HeartHandshake, BadgeIndianRupee,
  CheckCircle2, Smartphone, Route, UserPlus, Zap
} from 'lucide-react'
import BookingPanel from '../components/BookingPanel'
import { SiteHeader, SiteFooter } from '../components/SiteChrome'

const benefits = [
  { icon: Clock3, title: 'Quick local rides', body: 'Find an auto for everyday trips around Tiruvannamalai.' },
  { icon: CalendarDays, title: 'Ride on your time', body: 'Book now or plan your journey ahead of time.' },
  { icon: BadgeIndianRupee, title: 'Clear fare estimate', body: 'See an indicative fare before you proceed.' },
  { icon: ShieldCheck, title: 'Local and reliable', body: 'A service focused on the needs of our town.' }
]
const driverBenefits = [
  'Connect with passengers in your local area',
  'A simple app experience designed for auto drivers',
  'Transparent trip and earning information',
  'Build direct relationships with local customers'
]
const heroSlides = [
  {
    eyebrow: 'LOCAL AUTO BOOKING · TIRUVANNAMALAI',
    title: <>Your town.<br/><span className="text-wayz-yellow">Your ride.</span></>,
    description: 'Book a local auto in a few simple steps.',
  },
  {
    eyebrow: 'PLAN YOUR JOURNEY WITH CONFIDENCE',
    title: <>Know your route.<br/><span className="text-wayz-yellow">Know your fare.</span></>,
    description: 'Check road distance, travel time and an indicative fare before you go.',
  },
  {
    eyebrow: 'A LOCAL PLATFORM FOR LOCAL DRIVERS',
    title: <>Local rides.<br/><span className="text-wayz-yellow">Local drivers.</span></>,
    description: 'A simpler way for Tiruvannamalai passengers and auto drivers to connect.',
  }
]
function AutoHeroIllustration() {
  return <svg viewBox="0 0 560 330" className="h-full w-full" role="img" aria-label="Illustration of a 2WAYZ auto rickshaw on a local road">
    <defs><linearGradient id="autoSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dff2ff"/><stop offset="1" stopColor="#f8fbff"/></linearGradient><linearGradient id="autoBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd84d"/><stop offset="1" stopColor="#f4a900"/></linearGradient></defs>
    <rect width="560" height="330" rx="28" fill="url(#autoSky)"/>
    <circle cx="456" cy="64" r="29" fill="#ffd76a"/>
    <path d="M0 252Q125 210 250 250T560 240V330H0Z" fill="#cce8d1"/>
    <path d="M0 284Q160 250 300 286T560 270V330H0Z" fill="#a7cbb3"/>
    <path d="M70 245h420" stroke="#fff" strokeWidth="5" strokeDasharray="22 18" opacity=".8"/>
    <g transform="translate(78 45)">
      <path d="M105 174l17-76q7-28 38-28h112q20 0 32 18l38 58 9 28H105Z" fill="url(#autoBody)" stroke="#9a5b08" strokeWidth="6" strokeLinejoin="round"/>
      <path d="M160 76h107q12 0 20 13l24 39H146l11-40q2-12 3-12Z" fill="#174c79" stroke="#9a5b08" strokeWidth="5"/>
      <path d="M211 78v48M146 137h178" stroke="#fef3c7" strokeWidth="5"/>
      <path d="M92 171h275l20 19H83Z" fill="#263b50"/>
      <path d="M117 170l-12-34q-5-14 7-21l30-13 11 17-19 17 10 34Z" fill="#f7bd24" stroke="#9a5b08" strokeWidth="5"/>
      <path d="M326 142l36 7 12 20-42 1Z" fill="#e8a10c" stroke="#9a5b08" strokeWidth="5"/>
      <circle cx="145" cy="190" r="29" fill="#263544"/><circle cx="145" cy="190" r="13" fill="#d8e3eb"/>
      <circle cx="330" cy="190" r="29" fill="#263544"/><circle cx="330" cy="190" r="13" fill="#d8e3eb"/>
      <path d="M174 61h107l-10-21H189Z" fill="#f7bd24" stroke="#9a5b08" strokeWidth="5"/>
      <path d="M195 38h66" stroke="#263544" strokeWidth="8" strokeLinecap="round"/>
      <path d="M96 145h22" stroke="#fff4ca" strokeWidth="8" strokeLinecap="round"/>
      <rect x="205" y="143" width="54" height="22" rx="5" fill="#073b83"/><text x="232" y="158" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">2WAYZ</text>
    </g>
    <g fill="#073b83" opacity=".85"><circle cx="83" cy="75" r="5"/><circle cx="103" cy="58" r="3"/><circle cx="478" cy="133" r="5"/><circle cx="495" cy="115" r="3"/></g>
  </svg>
}
function HeroSlider() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive(current => (current + 1) % heroSlides.length), 6500)
    return () => window.clearInterval(timer)
  }, [])
  const slide = heroSlides[active]
  const previous = () => setActive(current => (current - 1 + heroSlides.length) % heroSlides.length)
  const next = () => setActive(current => (current + 1) % heroSlides.length)

  return <section aria-label="2WAYZ highlights" aria-roledescription="carousel" className="hero-pattern relative isolate overflow-hidden text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30 mix-blend-screen"><AutoHeroIllustration/></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#042b65]/95 via-[#073b83]/80 to-[#073b83]/55"/>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#042b65]/60 to-transparent"/>
    </div>
    <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 pt-8 sm:pb-10 sm:pt-10 lg:px-8 lg:pt-12">
      <div className="flex items-start justify-between gap-5">
        <div key={active} className="min-w-0 max-w-3xl animate-[heroFade_.45s_ease-out]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[10px] font-bold tracking-[.12em] text-blue-50 sm:text-[11px]"><MapPin size={14} className="text-wayz-yellow"/>{slide.eyebrow}</span>
          <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[46px]">{slide.title}</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-50 sm:text-sm">{slide.description}</p>
        </div>
        <div className="flex shrink-0 gap-2 pt-1" aria-label="Hero banner controls">
          <button type="button" onClick={previous} aria-label="Previous highlight" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-10"><ChevronLeft size={19}/></button>
          <button type="button" onClick={next} aria-label="Next highlight" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-10"><ChevronRight size={19}/></button>
        </div>
      </div>
      <div className="relative z-20 mt-7 w-full sm:mt-8">
        <BookingPanel/>
      </div>
    </div>
  </section>
}
function HowItWorks() {
  const steps = [
    { icon: MapPin, number: '01', title: 'Choose your locations', text: 'Enter your pickup point and destination using Google location suggestions.' },
    { icon: Route, number: '02', title: 'Check your route & fare', text: 'See the estimated road distance, travel time and indicative auto fare.' },
    { icon: Smartphone, number: '03', title: 'Request your auto', text: 'Continue to request a nearby driver. Live driver matching will be connected in the booking phase.' }
  ]
  return <section id="how-it-works" className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">Simple by design</p><h2 className="mt-3 text-3xl font-extrabold text-wayz-ink sm:text-4xl">Your ride in three easy steps</h2><p className="mt-3 text-sm leading-6 text-slate-500">A straightforward way to plan your local journey.</p></div><div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map(({icon:Icon,number,title,text})=><div key={number} className="rounded-3xl border border-slate-100 bg-wayz-mist/60 p-7"><span className="text-xs font-black tracking-widest text-wayz-blue">STEP {number}</span><div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-wayz-blue shadow-sm"><Icon size={26}/></div><h3 className="mt-5 text-lg font-extrabold text-wayz-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></div></section>
}
export default function HomePage() {
  return <div className="min-h-screen overflow-hidden bg-white">
    <SiteHeader/>
    <main>
      <HeroSlider/>
      <section className="border-b border-slate-100 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4 lg:px-8">{benefits.map(({icon:Icon,title,body})=><div key={title} className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><Icon size={21}/></div><div><h3 className="text-sm font-bold text-wayz-ink">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{body}</p></div></div>)}</div></section>
      <HowItWorks/>
      <section id="about" className="bg-wayz-mist/70"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20"><div className="relative"><div className="flex h-[300px] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-100 via-sky-50 to-amber-100 shadow-card sm:h-[390px]"><svg viewBox="0 0 560 330" className="h-full w-full" role="img" aria-label="Illustration of Arunachaleswarar temple gopuram"><rect width="560" height="330" fill="#eaf4ff"/><circle cx="445" cy="62" r="32" fill="#ffd76a"/><path d="M0 280q120-50 240 0t320 0v50H0" fill="#b9d9c2"/><path d="M190 285V126h180v159M170 126h220l-25-28H195z" fill="#d98d48" stroke="#a75f2c" strokeWidth="5"/><path d="M205 126l22-45 22 45 22-60 22 60 22-45 22 45 22-30 22 30" fill="#f4bd68" stroke="#a75f2c" strokeWidth="5"/><path d="M205 154h150M205 180h150M205 207h150M205 234h150" stroke="#a75f2c" strokeWidth="5"/><path d="M260 285v-65q20-28 40 0v65" fill="#78452d"/><path d="M145 285V185h35v100M380 285V185h35v100" fill="#c77d42"/><text x="280" y="315" textAnchor="middle" fill="#754526" fontSize="12" fontWeight="700" letterSpacing="3">TIRUVANNAMALAI</text></svg></div><div className="absolute -bottom-5 right-4 rounded-2xl bg-wayz-yellow px-5 py-4 shadow-lg sm:right-8"><p className="text-xs font-semibold text-wayz-ink">MADE FOR OUR TOWN</p><p className="text-lg font-extrabold text-wayz-navy">Ride local. Reach easy.</p></div></div><div className="pt-4 lg:pt-0"><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">A local mobility partner</p><h2 className="mt-3 text-3xl font-bold leading-tight text-wayz-ink sm:text-4xl">Getting around Tiruvannamalai, made simpler.</h2><p className="mt-5 text-sm leading-7 text-slate-600">From temple visits and market trips to everyday errands, 2WAYZ is being built around the way people travel in our town.</p><div className="mt-6 space-y-3">{['Book an auto when you need one','Plan a ride for a later time','See an indicative fare before continuing'].map(t=><p key={t} className="flex items-center gap-3 text-sm font-medium text-slate-700"><CheckCircle2 size={18} className="shrink-0 text-emerald-600"/>{t}</p>)}</div><a href="#book" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-6 py-3.5 text-sm font-bold text-white transition hover:bg-wayz-navy">Book your auto <ArrowRight size={17}/></a></div></div></section>
      <section id="drivers" className="bg-white"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"><div className="grid gap-10 overflow-hidden rounded-[30px] bg-wayz-navy p-7 text-white sm:p-10 lg:grid-cols-[1fr_.85fr] lg:items-center lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100"><HeartHandshake size={15} className="text-wayz-yellow"/> BUILT WITH LOCAL DRIVERS IN MIND</span><h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">A better way to connect with your next passenger.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-blue-100">2WAYZ aims to help Tiruvannamalai's auto drivers connect with nearby customers through a straightforward local booking platform.</p><Link to="/driver/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink transition hover:bg-amber-300">Join as a driver <ArrowRight size={17}/></Link></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"><h3 className="text-lg font-bold">Why drive with 2WAYZ?</h3><div className="mt-5 space-y-4">{driverBenefits.map(item=><div key={item} className="flex gap-3 text-sm leading-6 text-blue-50"><CheckCircle2 className="mt-0.5 shrink-0 text-wayz-yellow" size={19}/>{item}</div>)}</div><div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4"><Wallet className="text-wayz-yellow" size={25}/><p className="text-xs leading-5 text-blue-50">Clear trip details and earning information, designed around local auto drivers.</p></div></div></div></div></section>
      <section id="driver-registration" className="bg-wayz-mist"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">For auto drivers in Tiruvannamalai</p><h2 className="mt-2 text-2xl font-bold text-wayz-ink sm:text-3xl">Ready to join the 2WAYZ driver network?</h2><p className="mt-2 text-sm text-slate-600">Register your interest and be part of local mobility.</p></div><Link to="/driver/register" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-bold text-wayz-ink shadow-sm transition hover:bg-amber-300"><UserPlus size={18}/> Register as a driver</Link></div></section>
    </main>
    <SiteFooter/>
  </div>
}