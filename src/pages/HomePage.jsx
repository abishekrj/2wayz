import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, MapPin, ShieldCheck, Wallet,
  Clock3, CalendarDays, HeartHandshake, BadgeIndianRupee,
  CheckCircle2, Smartphone, Route, UserPlus, Zap
} from 'lucide-react'
import BookingPanel from '../components/BookingPanel'
import Brand from '../components/Brand'

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
function HeroSlider() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive(current => (current + 1) % heroSlides.length), 6500)
    return () => window.clearInterval(timer)
  }, [])
  const slide = heroSlides[active]
  const previous = () => setActive(current => (current - 1 + heroSlides.length) % heroSlides.length)
  const next = () => setActive(current => (current + 1) % heroSlides.length)
  return <section aria-label="2WAYZ highlights" aria-roledescription="carousel" className="hero-pattern relative overflow-visible text-white">
    <div className="mx-auto max-w-7xl px-5 pb-7 pt-8 sm:pb-9 sm:pt-10 lg:px-8 lg:pt-12">
      <div key={active} className="mx-auto max-w-3xl text-center animate-[heroFade_.45s_ease-out]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[10px] font-bold tracking-[.12em] text-blue-50 sm:text-[11px]"><MapPin size={14} className="text-wayz-yellow"/>{slide.eyebrow}</span>
        <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[48px]">{slide.title}</h1>
        <p className="mx-auto mt-2 max-w-2xl truncate whitespace-nowrap text-xs leading-5 text-blue-50 sm:text-sm">{slide.description}</p>
      </div>
      <div className="relative z-20 mx-auto mt-6 max-w-6xl sm:mt-7">
        <BookingPanel/>
      </div>
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2" role="group" aria-label="Choose slide">{heroSlides.map((item,index)=><button key={item.eyebrow} type="button" aria-label={'Show slide ' + (index+1)} aria-current={active===index?'true':undefined} onClick={()=>setActive(index)} className={'h-2 rounded-full transition-all ' + (active===index?'w-8 bg-wayz-yellow':'w-2 bg-white/50 hover:bg-white')}/>)}</div>
        <div className="flex gap-2"><button type="button" onClick={previous} aria-label="Previous slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 transition hover:bg-white/20"><ChevronLeft size={18}/></button><button type="button" onClick={next} aria-label="Next slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 transition hover:bg-white/20"><ChevronRight size={18}/></button></div>
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
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="min-h-screen overflow-hidden bg-white">
    <header className="relative z-30 border-b border-slate-100 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><Brand/><nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex"><a className="text-wayz-blue" href="#">Home</a><a className="transition hover:text-wayz-blue" href="#about">About</a><a className="transition hover:text-wayz-blue" href="#how-it-works">How it works</a><a className="transition hover:text-wayz-blue" href="#drivers">For drivers</a><a className="transition hover:text-wayz-blue" href="#contact">Contact</a></nav><div className="hidden md:block"><button className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wayz-navy">Login / Sign up <ChevronDown className="ml-1 inline" size={15}/></button></div><button aria-label="Toggle navigation" onClick={()=>setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 p-2 text-wayz-navy md:hidden">{menuOpen?<X/>:<Menu/>}</button></div>
    {menuOpen&&<nav className="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 text-sm font-semibold md:hidden">{['Home','About','How it works','For drivers','Contact'].map((item,i)=><a key={item} onClick={()=>setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-wayz-mist" href={['#','#about','#how-it-works','#drivers','#contact'][i]}>{item}</a>)}<button className="mt-1 rounded-xl bg-wayz-blue px-4 py-3 text-left text-white">Login / Sign up</button></nav>}</header>
    <main>
      <HeroSlider/>
      <section className="border-b border-slate-100 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4 lg:px-8">{benefits.map(({icon:Icon,title,body})=><div key={title} className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><Icon size={21}/></div><div><h3 className="text-sm font-bold text-wayz-ink">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{body}</p></div></div>)}</div></section>
      <HowItWorks/>
      <section id="about" className="bg-wayz-mist/70"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20"><div className="relative"><div className="flex h-[300px] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-100 via-sky-50 to-amber-100 shadow-card sm:h-[390px]"><svg viewBox="0 0 560 330" className="h-full w-full" role="img" aria-label="Illustration of Arunachaleswarar temple gopuram"><rect width="560" height="330" fill="#eaf4ff"/><circle cx="445" cy="62" r="32" fill="#ffd76a"/><path d="M0 280q120-50 240 0t320 0v50H0" fill="#b9d9c2"/><path d="M190 285V126h180v159M170 126h220l-25-28H195z" fill="#d98d48" stroke="#a75f2c" strokeWidth="5"/><path d="M205 126l22-45 22 45 22-60 22 60 22-45 22 45 22-30 22 30" fill="#f4bd68" stroke="#a75f2c" strokeWidth="5"/><path d="M205 154h150M205 180h150M205 207h150M205 234h150" stroke="#a75f2c" strokeWidth="5"/><path d="M260 285v-65q20-28 40 0v65" fill="#78452d"/><path d="M145 285V185h35v100M380 285V185h35v100" fill="#c77d42"/><text x="280" y="315" textAnchor="middle" fill="#754526" fontSize="12" fontWeight="700" letterSpacing="3">TIRUVANNAMALAI</text></svg></div><div className="absolute -bottom-5 right-4 rounded-2xl bg-wayz-yellow px-5 py-4 shadow-lg sm:right-8"><p className="text-xs font-semibold text-wayz-ink">MADE FOR OUR TOWN</p><p className="text-lg font-extrabold text-wayz-navy">Ride local. Reach easy.</p></div></div><div className="pt-4 lg:pt-0"><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">A local mobility partner</p><h2 className="mt-3 text-3xl font-bold leading-tight text-wayz-ink sm:text-4xl">Getting around Tiruvannamalai, made simpler.</h2><p className="mt-5 text-sm leading-7 text-slate-600">From temple visits and market trips to everyday errands, 2WAYZ is being built around the way people travel in our town.</p><div className="mt-6 space-y-3">{['Book an auto when you need one','Plan a ride for a later time','See an indicative fare before continuing'].map(t=><p key={t} className="flex items-center gap-3 text-sm font-medium text-slate-700"><CheckCircle2 size={18} className="shrink-0 text-emerald-600"/>{t}</p>)}</div><a href="#book" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-6 py-3.5 text-sm font-bold text-white transition hover:bg-wayz-navy">Book your auto <ArrowRight size={17}/></a></div></div></section>
      <section id="drivers" className="bg-white"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"><div className="grid gap-10 overflow-hidden rounded-[30px] bg-wayz-navy p-7 text-white sm:p-10 lg:grid-cols-[1fr_.85fr] lg:items-center lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100"><HeartHandshake size={15} className="text-wayz-yellow"/> BUILT WITH LOCAL DRIVERS IN MIND</span><h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">A better way to connect with your next passenger.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-blue-100">2WAYZ aims to help Tiruvannamalai's auto drivers connect with nearby customers through a straightforward local booking platform.</p><Link to="/driver/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink transition hover:bg-amber-300">Join as a driver <ArrowRight size={17}/></Link></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"><h3 className="text-lg font-bold">Why drive with 2WAYZ?</h3><div className="mt-5 space-y-4">{driverBenefits.map(item=><div key={item} className="flex gap-3 text-sm leading-6 text-blue-50"><CheckCircle2 className="mt-0.5 shrink-0 text-wayz-yellow" size={19}/>{item}</div>)}</div><div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4"><Wallet className="text-wayz-yellow" size={25}/><p className="text-xs leading-5 text-blue-50">Clear trip details and earning information, designed around local auto drivers.</p></div></div></div></div></section>
      <section id="driver-registration" className="bg-wayz-mist"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">For auto drivers in Tiruvannamalai</p><h2 className="mt-2 text-2xl font-bold text-wayz-ink sm:text-3xl">Ready to join the 2WAYZ driver network?</h2><p className="mt-2 text-sm text-slate-600">Register your interest and be part of local mobility.</p></div><Link to="/driver/register" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-bold text-wayz-ink shadow-sm transition hover:bg-amber-300"><UserPlus size={18}/> Register as a driver</Link></div></section>
    </main>
    <footer id="contact" className="bg-[#052f6c] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8"><div><Brand light/><p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">Your local mobility partner in Tiruvannamalai. Ride local. Reach easy.</p></div><div><h3 className="font-bold">Explore</h3><div className="mt-4 grid gap-3 text-sm text-blue-100"><a href="#about" className="hover:text-wayz-yellow">About 2WAYZ</a><a href="#how-it-works" className="hover:text-wayz-yellow">How it works</a><a href="#drivers" className="hover:text-wayz-yellow">For drivers</a></div></div><div><h3 className="font-bold">Get in touch</h3><p className="mt-4 text-sm text-blue-100">Tiruvannamalai, Tamil Nadu</p><p className="mt-3 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin size={16}/> Tiruvannamalai, Tamil Nadu</p></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-blue-200 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} 2WAYZ. All rights reserved.</span><span>Local mobility. Made simple.</span></div></div></footer>
  </div>
}