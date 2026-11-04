import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, MapPin, Landmark, Mountain, Leaf, Sun, Sparkles, ArrowUpRight, Zap, CalendarClock, BadgeIndianRupee, ShieldCheck, CheckCircle2, Smartphone, Route, UserPlus, Wallet, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react'
import BookingPanel from '../components/BookingPanel'
import { SiteHeader, SiteFooter } from '../components/SiteChrome'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
const mediaUrl = value => value && value.startsWith('/') ? new URL(value, API_BASE).toString() : value
const iconMap = { clock: Zap, zap: Zap, calendar: CalendarClock, wallet: BadgeIndianRupee, shield: ShieldCheck, map: MapPin, route: Route, phone: Smartphone }
const defaults = {
  'hero-banner': { slides: [
    { eyebrow:'LOCAL AUTO BOOKING · TIRUVANNAMALAI', title:'Your town. Your ride.', description:'Book a local auto in a few simple steps.' },
    { eyebrow:'PLAN YOUR JOURNEY WITH CONFIDENCE', title:'Know your route. Know your fare.', description:'Check road distance, travel time and an indicative fare before you go.' },
    { eyebrow:'A LOCAL PLATFORM FOR LOCAL DRIVERS', title:'Local rides. Local drivers.', description:'A simpler way for Tiruvannamalai passengers and auto drivers to connect.' }
  ]},
  benefits: { items:[
    {title:'Quick local rides',body:'Find an auto for everyday trips around Tiruvannamalai.',icon:'zap'},
    {title:'Ride on your time',body:'Book now or plan your journey ahead of time.',icon:'calendar'},
    {title:'Clear fare estimate',body:'See an indicative fare before you proceed.',icon:'wallet'},
    {title:'Local and reliable',body:'A service focused on the needs of our town.',icon:'shield'}
  ]},
  'how-it-works': {eyebrow:'Simple by design',heading:'Your ride in three easy steps',description:'A straightforward way to plan your local journey.',steps:[
    {title:'Choose your locations',text:'Enter your pickup point and destination using Google location suggestions.'},
    {title:'Check your route & fare',text:'See the estimated road distance, travel time and indicative auto fare.'},
    {title:'Request your auto',text:'Request an auto; live driver matching is coming soon.'}
  ]},
  'darshan-promo': {heading:'Need a ticket for Dharshan?',body:'Get started with your Darshan ticket booking through the Tamil Nadu Hindu Religious & Charitable Endowments Department portal. Plan your visit with greater peace of mind.',buttonText:'Book Darshan Tickets',buttonUrl:'https://hrce.tn.gov.in/intrahrce/login',disclosure:'You’ll be redirected to the official HR&CE website to continue.'},
  'nearby-places': {heading:'Places to Visit in Tiruvannamalai',places:['Arunachaleswarar Temple','Sri Ramana Ashram','Virupaksha Cave','Skandashramam','Yogi Ramsuratkumar Ashram','Adi Annamalai Temple','Seshadri Swamigal Ashram','Pachaiamman Temple']},
  'upcoming-events': {heading:'Upcoming Events',events:[{title:'Karthigai Deepam',date:'2026-11-24'},{title:'New Year 2027',date:'2027-01-01'}]},
  about:{eyebrow:'A local mobility partner',heading:'Getting around Tiruvannamalai, made simpler.',body:'From temple visits and market trips to everyday errands, 2WAYZ is being built around the way people travel in our town.',points:['Book an auto when you need one','Plan a ride for a later time','See an indicative fare before continuing']},
  drivers:{eyebrow:'BUILT WITH LOCAL DRIVERS IN MIND',heading:'A better way to connect with your next passenger.',body:"2WAYZ aims to help Tiruvannamalai's auto drivers connect with nearby customers through a straightforward local booking platform.",buttonText:'Join as a driver',benefits:['Connect with passengers in your local area','A simple app experience designed for auto drivers','Transparent trip and earning information','Build direct relationships with local customers']}
}
const HOMEPAGE_CACHE_KEY = 'twoWayz.publicHomepage.v1'
function readHomepageCache() {
  try { return JSON.parse(sessionStorage.getItem(HOMEPAGE_CACHE_KEY) || '{}') } catch { return {} }
}
function useHomepageSections(){
  const [sections,setSections]=useState(readHomepageCache)
  useEffect(()=>{
    let active=true
    fetch(`${API_BASE}/homepage/public`)
      .then(r=>{if(!r.ok)throw new Error('CMS unavailable');return r.json()})
      .then(data=>{if(active){const next={};for(const section of data.sections||[])next[section.slug]=section.content;setSections(next);try{sessionStorage.setItem(HOMEPAGE_CACHE_KEY,JSON.stringify(next))}catch{}}})
      .catch(()=>{})
    return()=>{active=false}
  },[])
  return useMemo(()=>Object.fromEntries(Object.entries(defaults).map(([slug,content])=>[slug,sections[slug]||content])),[sections])
}
function SectionTitle({eyebrow,heading,description}){return <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">{eyebrow}</p><h2 className="mt-3 text-3xl font-extrabold text-wayz-ink sm:text-4xl">{heading}</h2>{description&&<p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>}</div>}
function Hero({data,destination}) {
 const slides=Array.isArray(data.slides)&&data.slides.length?data.slides:defaults['hero-banner'].slides
 const [active,setActive]=useState(0)
 useEffect(()=>{if(active>=slides.length)setActive(0)},[active,slides.length])
 useEffect(()=>{const timer=window.setInterval(()=>setActive(i=>(i+1)%slides.length),6500);return()=>window.clearInterval(timer)},[slides.length])
 const slide=slides[active]||slides[0]
 return <section className="hero-pattern relative isolate min-h-[430px] overflow-visible text-white sm:min-h-[450px]"><div className="absolute inset-0 bg-gradient-to-r from-[#042b65] via-[#073b83] to-[#0b4b91]"/>{slide.imageUrl&&<img src={mediaUrl(slide.imageUrl)} alt="" aria-hidden="true" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-25 transition-opacity duration-500"/>}<div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 pt-8 sm:pb-10 sm:pt-10 lg:px-8 lg:pt-12"><div className="flex items-start justify-between gap-5"><div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[10px] font-bold tracking-[.12em] text-blue-50"><MapPin size={14} className="text-wayz-yellow"/>{slide.eyebrow}</span><h1 className="mt-3 whitespace-pre-line text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[46px]">{slide.title}</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-blue-50 sm:text-sm">{slide.description}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={()=>setActive(i=>(i-1+slides.length)%slides.length)} aria-label="Previous slide" className="rounded-full border border-white/35 p-2"><ChevronLeft/></button><button type="button" onClick={()=>setActive(i=>(i+1)%slides.length)} aria-label="Next slide" className="rounded-full border border-white/35 p-2"><ChevronRight/></button></div></div><div className="relative z-20 mt-7 w-full sm:mt-8"><BookingPanel initialDestination={destination}/></div></div></section>
}
function Events({data}){
 const events=Array.isArray(data.events)?data.events.filter(e=>e.title&&e.date):[]
 const [now,setNow]=useState(Date.now()),[active,setActive]=useState(0)
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[])
 useEffect(()=>{if(active>=events.length)setActive(0)},[active,events.length])
 if(!events.length)return null
 const event=events[active],target=new Date(event.date.length===10?event.date+'T00:00:00+05:30':event.date).getTime(),remaining=Math.max(0,target-now)
 const units=[['Days',Math.floor(remaining/86400000)],['Hours',Math.floor(remaining%86400000/3600000)],['Minutes',Math.floor(remaining%3600000/60000)],['Seconds',Math.floor(remaining%60000/1000)]]
 const dateLabel=new Date(target).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})
 const past=remaining===0
 return <section className="relative overflow-hidden bg-[#f5f8fc] py-16 sm:py-20"><div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/><div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-100/60 blur-3xl"/>
 <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
 <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-wayz-blue"><CalendarClock size={13}/> TIRUVANNAMALAI HIGHLIGHTS</p><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-wayz-ink sm:text-4xl">{data.heading||'Upcoming Events'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Stay in the loop with festivals and special days happening around our town.</p></div>
 <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-bold text-slate-500">{String(active+1).padStart(2,'0')} <span className="text-slate-300">/</span> {String(events.length).padStart(2,'0')} events</span><div className="flex gap-2"><button type="button" onClick={()=>setActive(i=>(i-1+events.length)%events.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-wayz-blue hover:text-wayz-blue" aria-label="Previous event"><ChevronLeft size={19}/></button><button type="button" onClick={()=>setActive(i=>(i+1)%events.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-wayz-blue hover:text-wayz-blue" aria-label="Next event"><ChevronRight size={19}/></button></div></div></div>
 <article className="mt-8 grid overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_14px_44px_rgba(15,45,80,0.08)] lg:grid-cols-[1.1fr_.9fr]">
 <div className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-[#0b3978] p-7 text-white sm:p-10"><div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[30px] border-white/[0.06]"/><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-100"><Sparkles size={12}/>{past?'Celebration day':'Save the date'}</span><h3 className="mt-6 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl">{event.title}</h3>{event.subtitle&&<p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">{event.subtitle}</p>}</div><div className="relative mt-8 flex items-center gap-3 border-t border-white/15 pt-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wayz-yellow text-wayz-ink"><CalendarClock size={23}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200">Event date</p><p className="mt-1 text-sm font-extrabold">{dateLabel}</p></div></div></div>
 <div className="flex flex-col justify-center bg-white p-7 sm:p-10"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-wayz-blue">{past?'The celebration is here':'Counting down'}</p><h4 className="mt-2 text-xl font-extrabold text-wayz-ink">{past?'Have a wonderful celebration!':'Time until the event'}</h4></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Sparkles size={21}/></div></div>
 <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-3">{units.map(([label,value])=><div key={label} className="rounded-2xl border border-slate-100 bg-[#f5f8fc] px-1 py-4 text-center sm:px-2"><p className="text-2xl font-black tabular-nums tracking-tight text-wayz-ink sm:text-3xl">{String(value).padStart(2,'0')}</p><p className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 sm:text-[10px]">{label}</p></div>)}</div>
 <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5"><div className="flex items-center gap-2">{events.map((e,i)=><button type="button" key={e.title+i} onClick={()=>setActive(i)} aria-label={'Show '+e.title} className={i===active?'h-2.5 w-7 rounded-full bg-wayz-blue':'h-2.5 w-2.5 rounded-full bg-slate-200 hover:bg-slate-400'}/>)}</div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discover local events</span></div></div></article></div></section>
}
export default function HomePage(){
 const cms=useHomepageSections(),location=useLocation()
 const [destination,setDestination]=useState(()=>location.state?.destination || null)
 useEffect(()=>{if(destination){const timer=window.setTimeout(()=>document.getElementById('book')?.scrollIntoView({behavior:'smooth',block:'center'}),300);return()=>window.clearTimeout(timer)}},[destination])
 const benefits=cms.benefits.items||[]
 const steps=cms['how-it-works'].steps||[]
 const places=(cms['nearby-places'].places||[]).filter(place=>typeof place==='string'||place.isPublished!==false)
 const featuredPlaces=places.slice(0,4)
 const drivers=cms.drivers.benefits||[]
 return <div className="min-h-screen overflow-x-clip bg-white"><SiteHeader/><main>
 <Hero data={cms['hero-banner']} destination={destination}/>
 <section className="relative overflow-hidden border-b border-slate-100 bg-[#f5f8fc] py-12 sm:py-16"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/><div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl"/><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-8 flex flex-col gap-2 sm:mb-9 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-wayz-blue">THE 2WAYZ ADVANTAGE</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-wayz-ink sm:text-3xl">Local rides, made easier.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Thoughtful features for getting around Tiruvannamalai, every day.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{benefits.map((item,i)=>{const Icon=iconMap[item.icon]||[Zap,CalendarClock,BadgeIndianRupee,ShieldCheck][i%4];const iconClass=i%4===1?'bg-amber-50 text-amber-600':i%4===2?'bg-emerald-50 text-emerald-600':i%4===3?'bg-violet-50 text-violet-600':'bg-blue-50 text-wayz-blue';return <article key={item.title||i} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_22px_rgba(15,45,80,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,45,80,0.11)] sm:p-6"><div className="flex items-start justify-between"><span className={"flex h-14 w-14 items-center justify-center rounded-2xl " + iconClass}><Icon size={27} strokeWidth={2.1}/></span><span className="text-xs font-extrabold tracking-widest text-slate-300">0{i+1}</span></div><h3 className="mt-5 text-base font-extrabold text-wayz-ink sm:text-lg">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p><div className="mt-5 h-1 w-10 rounded-full bg-wayz-yellow transition-all duration-300 group-hover:w-16"/></article>})}</div></div></section>
 <section id="how-it-works" className="relative overflow-hidden bg-white py-16 sm:py-20"><div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-blue-50 blur-3xl"/><div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-amber-50/70 blur-3xl"/><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><SectionTitle eyebrow={cms['how-it-works'].eyebrow} heading={cms['how-it-works'].heading} description={cms['how-it-works'].description}/><div className="relative mt-12 grid gap-5 md:grid-cols-3 md:gap-6">{steps.map((step,i)=>{const Icon=[MapPin,Route,Smartphone][i%3];const accent=i===1?'bg-amber-50 text-amber-600':i===2?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-wayz-blue';return <article key={step.title||i} className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_28px_rgba(15,45,80,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(15,45,80,0.11)] sm:p-8"><div className="flex items-start justify-between"><span className={"flex h-16 w-16 items-center justify-center rounded-2xl " + accent}><Icon size={30} strokeWidth={1.9}/></span><span className="text-4xl font-black tracking-tight text-slate-100 transition-colors group-hover:text-blue-100">{String(i+1).padStart(2,'0')}</span></div><div className="mt-7"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-wayz-blue">STEP {String(i+1).padStart(2,'0')}</p><h3 className="mt-2 text-lg font-extrabold text-wayz-ink sm:text-xl">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{step.text}</p></div><div className="mt-auto flex items-center gap-2 pt-6"><span className="h-1 w-8 rounded-full bg-wayz-yellow transition-all duration-300 group-hover:w-14"/><span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">2WAYZ journey</span></div></article>})}</div></div></section>
 <section className="bg-wayz-mist/60 py-10 sm:py-14"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="relative overflow-hidden rounded-[28px] bg-[#073B83] px-6 py-8 text-white shadow-card sm:px-10 sm:py-10 lg:px-14"><svg aria-hidden="true" viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute -right-3 -top-5 hidden h-[290px] w-[250px] text-white opacity-[0.10] sm:block"><path d="M130 8 151 31 146 48 169 67 163 85 185 105 178 123 201 145 193 163 216 187 207 207 231 232 220 252 242 279H18L40 252 29 232 53 207 44 187 67 163 59 145 82 123 75 105 97 85 91 67 114 48 109 31 130 8Z" fill="currentColor"/><path d="M130 28V278M96 77H164M78 116H182M60 156H200M44 197H216M27 238H233M103 278V204Q130 174 157 204V278M112 278V216Q130 195 148 216V278" stroke="#073B83" strokeWidth="4"/><path d="M116 50H144M101 91H159M84 132H176M67 174H193M50 215H210" stroke="#073B83" strokeWidth="3"/><circle cx="130" cy="62" r="7" fill="#073B83"/><path d="M130 0V18M118 14H142" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div className="max-w-3xl"><p className="text-xs font-bold tracking-widest text-blue-200">YOUR SPIRITUAL VISIT STARTS HERE</p><h2 className="mt-4 text-2xl font-extrabold sm:text-4xl">{cms['darshan-promo'].heading === 'Planning a visit to Arunachaleswarar Temple?' ? 'Need a ticket for Dharshan?' : cms['darshan-promo'].heading}</h2><p className="mt-3 text-sm leading-7 text-blue-100">{cms['darshan-promo'].body}</p><p className="mt-3 text-xs text-blue-200">{cms['darshan-promo'].disclosure}</p></div><a href={cms['darshan-promo'].buttonUrl||'#'} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-extrabold text-wayz-ink">{cms['darshan-promo'].buttonText||'Learn more'} <ArrowRight size={18}/></a></div></div></div></section>
 <section className="relative overflow-hidden bg-[#f5f8fc] py-16 sm:py-20">
  <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl"/>
  <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl"/>
  <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-wayz-blue"><Sparkles size={13}/> EXPLORE TIRUVANNAMALAI</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-wayz-ink sm:text-4xl">{cms['nearby-places'].heading}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Discover well-loved temples, peaceful retreats and special places around our town.</p>
      </div>
      <Link to="/places" className="inline-flex w-fit items-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#174f91]">View all <ArrowRight size={16}/></Link>
    </div>
    <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {featuredPlaces.map((entry,i)=>{
        const place=typeof entry==='string'?{name:entry}:entry;
        const PlaceIcon=[Landmark,Mountain,Leaf,Sun,Sparkles,Landmark,Leaf,Mountain][i%8];
        return <button key={place.name||i} onClick={()=>{setDestination({name:place.name,searchText:place.name+', Tiruvannamalai, Tamil Nadu, India',address:place.name+', Tiruvannamalai, Tamil Nadu, India',placeId:null,location:null});document.getElementById('book')?.scrollIntoView({behavior:'smooth',block:'center'})}} className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white text-left shadow-[0_8px_28px_rgba(15,45,80,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(15,45,80,0.13)]">
          <div className="relative aspect-[5/4] overflow-hidden bg-[#e8f0fb]">
            {place.imageUrl||place.image
              ? <img src={mediaUrl(place.imageUrl||place.image)} alt={place.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"/>
              : <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#eaf2fc]">
                  <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[18px] border-white/35"/>
                  <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/35"/>
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/70 bg-white/65 text-wayz-blue shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"><PlaceIcon size={43} strokeWidth={1.5}/></div>
                  <span className="absolute bottom-4 left-4 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#31577f]/70">Tiruvannamalai</span>
                </div>}
            <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-wayz-blue shadow-sm">{i===0?'Featured place':'Local favourite'}</div>
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-wayz-blue shadow-sm transition-all duration-300 group-hover:rotate-45 group-hover:bg-wayz-yellow"><ArrowUpRight size={18}/></span>
          </div>
          <div className="p-5">
            <h3 className="text-base font-extrabold leading-snug text-wayz-ink sm:text-[17px]">{place.name}</h3>
            {place.subtitle&&<p className="mt-1 text-xs font-semibold text-wayz-blue">{place.subtitle}</p>}
            {place.detail&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{place.detail}</p>}
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-wayz-blue">Choose as drop-off</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-wayz-blue transition-all group-hover:bg-wayz-blue group-hover:text-white"><ArrowRight size={15}/></span>
            </div>
          </div>
        </button>
      })}
    </div>
  </div>
</section>
 <Events data={cms['upcoming-events']}/>
 <section id="about" className="relative overflow-hidden bg-[#f5f8fc] py-16 sm:py-20">
  <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/>
  <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-100/60 blur-3xl"/>
  <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
   <div className="grid items-center gap-9 lg:grid-cols-[.95fr_1.05fr] lg:gap-14">
    <div className="relative">
     <div className="relative min-h-[340px] overflow-hidden rounded-[30px] bg-[#0b3978] shadow-[0_18px_48px_rgba(7,45,100,0.18)] sm:min-h-[420px]">
      {cms.about.imageUrl
       ? <><img src={mediaUrl(cms.about.imageUrl)} alt={cms.about.heading} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[#062c62]/45"/></>
       : <><div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border-[30px] border-white/[0.07]"/><div className="pointer-events-none absolute -bottom-28 -left-12 h-72 w-72 rounded-full border-[26px] border-white/[0.06]"/></>}
      <div className="relative flex min-h-[340px] flex-col justify-between p-7 text-white sm:min-h-[420px] sm:p-10">
       <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-100"><MapPin size={13}/> Tiruvannamalai, Tamil Nadu</span><span className="rounded-full bg-wayz-yellow px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-wayz-ink">Local first</span></div>
       <div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-blue-200">Your town. Your journeys.</p><p className="mt-2 text-5xl font-black tracking-[-.06em] sm:text-7xl">2WAYZ<span className="text-wayz-yellow">.</span></p><p className="mt-3 max-w-xs text-sm leading-6 text-blue-100">A simpler way to get around the places that make our town special.</p></div>
       <div className="flex items-center gap-3 border-t border-white/15 pt-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-wayz-yellow text-wayz-ink"><HeartHandshake size={22}/></div><div><p className="text-sm font-extrabold">Built around local needs</p><p className="mt-1 text-xs text-blue-200">Connecting everyday trips across our town</p></div></div>
      </div>
     </div>
     <div className="absolute -bottom-4 right-5 hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-wayz-blue"><MapPin size={18}/></span><span className="text-xs font-extrabold text-wayz-ink">Made for Tiruvannamalai</span></div>
    </div>
    <div className="py-2">
     <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-wayz-blue"><Sparkles size={13}/> {cms.about.eyebrow}</p>
     <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-wayz-ink sm:text-4xl lg:text-[42px]">{cms.about.heading}</h2>
     <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{cms.about.body}</p>
     <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {(cms.about.points||[]).map((point,i)=>{const Icon=[Zap,CalendarClock,BadgeIndianRupee,ShieldCheck][i%4];return <div key={i} className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(15,45,80,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-wayz-blue transition-colors group-hover:bg-wayz-blue group-hover:text-white"><Icon size={20}/></span><span className="pt-1 text-sm font-bold leading-6 text-slate-700">{point}</span></div>})}
     </div>
     <a href="#book" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#174f91]">Book your auto <ArrowRight size={17}/></a>
    </div>
   </div>
  </div>
 </section>
 <section id="drivers" className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-10 rounded-[30px] bg-wayz-navy p-7 text-white sm:p-10 lg:grid-cols-[1fr_.85fr] lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100"><HeartHandshake size={15} className="text-wayz-yellow"/>{cms.drivers.eyebrow}</span><h2 className="mt-5 text-3xl font-bold sm:text-4xl">{cms.drivers.heading}</h2><p className="mt-4 text-sm leading-7 text-blue-100">{cms.drivers.body}</p><Link to="/driver/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink">{cms.drivers.buttonText||'Join as a driver'} <ArrowRight size={17}/></Link></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"><h3 className="text-lg font-bold">Why drive with 2WAYZ?</h3><div className="mt-5 space-y-4">{drivers.map((item,i)=><div key={i} className="flex gap-3 text-sm leading-6 text-blue-50"><CheckCircle2 className="mt-0.5 shrink-0 text-wayz-yellow" size={19}/>{item}</div>)}</div><div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4"><Wallet className="text-wayz-yellow" size={25}/><p className="text-xs leading-5 text-blue-50">Clear trip details and earning information, designed around local auto drivers.</p></div></div></div></div></section>
 <section id="driver-registration" className="bg-wayz-mist py-12"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">For auto drivers in Tiruvannamalai</p><h2 className="mt-2 text-2xl font-bold text-wayz-ink sm:text-3xl">Ready to join the 2WAYZ driver network?</h2><p className="mt-2 text-sm text-slate-600">Register your interest and be part of local mobility.</p></div><Link to="/driver/register" className="inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-bold text-wayz-ink"><UserPlus size={18}/> Register as a driver</Link></div></section>
 </main><SiteFooter/></div>
}
