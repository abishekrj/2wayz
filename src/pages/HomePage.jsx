import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, MapPin, Landmark, Mountain, Leaf, Sun, Sparkles, ArrowUpRight, Zap, CalendarClock, BadgeIndianRupee, ShieldCheck, CheckCircle2, Smartphone, Route, UserPlus, Wallet, HeartHandshake, ChevronLeft, ChevronRight, ChevronDown, HelpCircle } from 'lucide-react'
import BookingPanel from '../components/BookingPanel'
import PickupMap from '../components/PickupMap'
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
function SectionTitle({eyebrow,heading,description}){return <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">{eyebrow}</p><h2 className="mt-3 text-3xl font-bold text-wayz-ink sm:text-4xl">{heading}</h2>{description&&<p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>}</div>}
function Hero({data,destination}) {
 const [pickup,setPickup]=useState(null)
 const [dropoff,setDropoff]=useState(destination || null)
 const [activeField,setActiveField]=useState('pickup')
 const [route,setRoute]=useState(null)
 return <section className="relative isolate z-20 overflow-visible bg-[#f5f8fc] text-white">
  <PickupMap value={activeField === 'destination' ? dropoff : pickup} onSelect={activeField === 'destination' ? setDropoff : setPickup} activeField={activeField} route={route}/>
  <div className="relative z-20 mx-auto -mt-7 max-w-7xl px-4 pb-7 sm:-mt-12 sm:px-8 sm:pb-10 lg:-mt-14">
   <BookingPanel initialDestination={destination} pickup={pickup} onPickupChange={setPickup} destination={dropoff} onDestinationChange={setDropoff} activeField={activeField} onActiveFieldChange={setActiveField} onEstimateChange={setRoute}/>
  </div>
 </section>
}

const defaultFaqs = [
  { question: 'How do I book an auto with 2WAYZ?', answer: 'Enter your pickup location and destination, review the route and indicative fare, then continue to request an auto. You can track your booking from the travel page.' },
  { question: 'How is my fare calculated?', answer: 'The fare estimate is based on the road route and the indicative tariff shown before you book. The final fare is confirmed for your completed trip.' },
  { question: 'How do I pay for my ride?', answer: 'At present, passengers pay the driver directly for the completed trip. 2WAYZ does not collect the passenger fare online.' },
  { question: 'Can I cancel a booking?', answer: 'You can cancel an eligible ride from the travel tracking page or My Bookings before the trip starts. A ride that is already in progress cannot be cancelled by the passenger.' },
  { question: 'Can I book another auto while I have an active ride?', answer: 'Only one active booking is allowed at a time. Complete or cancel your current ride before requesting another auto.' },
  { question: 'Where is 2WAYZ currently available?', answer: '2WAYZ is focused on local auto journeys in and around Tiruvannamalai.' }
]
function FaqSection() {
 const [config,setConfig]=useState({heading:'Frequently Asked Questions',description:'Quick answers to common questions about booking and travelling with 2WAYZ.',faqs:defaultFaqs})
 const [active,setActive]=useState(0)
 useEffect(()=>{
  let mounted=true
  fetch(API_BASE+'/places/faqs/public').then(response=>{if(!response.ok)throw new Error('FAQ unavailable');return response.json()}).then(data=>{if(mounted)setConfig(data)}).catch(()=>{})
  return()=>{mounted=false}
 },[])
 const faqs=Array.isArray(config.faqs)?config.faqs:[]
 if(!faqs.length)return null
 return <section id="faqs" className="bg-[#f5f8fc] py-16 sm:py-20">
  <div className="mx-auto max-w-5xl px-5 lg:px-8">
   <div className="mx-auto max-w-2xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-wayz-blue"><HelpCircle size={14}/> NEED A HAND?</span><h2 className="mt-4 text-3xl font-bold tracking-tight text-wayz-ink sm:text-4xl">{config.heading||'Frequently Asked Questions'}</h2>{config.description&&<p className="mt-3 text-sm leading-6 text-slate-500">{config.description}</p>}</div>
   <div className="mt-9 space-y-3">{faqs.map((faq,index)=><article key={faq.id||faq.question||index} className={'overflow-hidden rounded-2xl border bg-white transition-colors '+(active===index?'border-blue-200 shadow-[0_8px_24px_rgba(15,45,80,0.06)]':'border-slate-200 shadow-sm')}><button type="button" aria-expanded={active===index} onClick={()=>setActive(current=>current===index?-1:index)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"><span className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-wayz-blue">{String(index+1).padStart(2,'0')}</span><span className="text-sm font-bold leading-6 text-wayz-ink sm:text-base">{faq.question}</span></span><ChevronDown size={19} className={'shrink-0 text-wayz-blue transition-transform duration-300 ease-in-out '+(active===index?'rotate-180':'')}/></button><div
    aria-hidden={active!==index}
    className={'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out '+(active===index?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0')}
   ><div className="min-h-0 overflow-hidden"><div className="border-t border-slate-100 px-5 pb-5 pt-4 pl-[4.25rem] text-sm leading-7 text-slate-600 sm:px-6 sm:pl-[4.75rem]">{faq.answer}</div></div></div></article>)}</div>
   <div className="mt-8 text-center"><a href="#book" className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#174f91]">Still have questions? Book your auto <ArrowRight size={17}/></a></div>
  </div>
 </section>
}

function EventCard({event,now,events,onSelect,active}){
 const target=new Date(event.date.length===10?event.date+'T00:00:00+05:30':event.date).getTime()
 const remaining=Math.max(0,target-now)
 const units=[['Days',Math.floor(remaining/86400000)],['Hours',Math.floor(remaining%86400000/3600000)],['Minutes',Math.floor(remaining%3600000/60000)],['Seconds',Math.floor(remaining%60000/1000)]]
 const dateLabel=new Date(target).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})
 const past=remaining===0
 return <article className="grid w-full shrink-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_14px_44px_rgba(15,45,80,0.08)] lg:grid-cols-[1.1fr_.9fr]">
  <div className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-[#0b3978] p-7 text-white sm:p-10"><div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[30px] border-white/[0.06]"/><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-blue-100"><Sparkles size={12}/>{past?'Celebration day':'Save the date'}</span><h3 className="mt-6 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-4xl">{event.title}</h3>{event.subtitle&&<p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">{event.subtitle}</p>}</div><div className="relative mt-8 flex items-center gap-3 border-t border-white/15 pt-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wayz-yellow text-wayz-ink"><CalendarClock size={23}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200">Event date</p><p className="mt-1 text-sm font-bold">{dateLabel}</p></div></div></div>
  <div className="flex flex-col justify-center bg-white p-7 sm:p-10"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-wayz-blue">{past?'The celebration is here':'Counting down'}</p><h4 className="mt-2 text-xl font-bold text-wayz-ink">{past?'Have a wonderful celebration!':'Time until the event'}</h4></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Sparkles size={21}/></div></div>
  <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-3">{units.map(([label,value])=><div key={label} className="rounded-2xl border border-slate-100 bg-[#f5f8fc] px-1 py-4 text-center sm:px-2"><p className="text-2xl font-black tabular-nums tracking-tight text-wayz-ink sm:text-3xl">{String(value).padStart(2,'0')}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">{label}</p></div>)}</div>
  <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5"><div className="flex items-center gap-2">{events.map((e,i)=><button type="button" key={e.title+i} onClick={()=>onSelect(i)} aria-label={'Show '+e.title} className={i===active?'h-2.5 w-7 rounded-full bg-wayz-blue':'h-2.5 w-2.5 rounded-full bg-slate-200 hover:bg-slate-400'}/>)}</div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discover local events</span></div></div>
 </article>
}
function Events({data}){
 const events=Array.isArray(data.events)?data.events.filter(e=>e.title&&e.date):[]
 const [now,setNow]=useState(Date.now()),[active,setActive]=useState(0),[pending,setPending]=useState(null),[sliding,setSliding]=useState(false)
 const frameRef=useRef(null),timerRef=useRef(null)
 const changeEvent=index=>{if(events.length<2||sliding||pending!==null)return;const next=typeof index==='function'?index(active):index;if(next===active)return;setPending((next+events.length)%events.length);frameRef.current=window.requestAnimationFrame(()=>{frameRef.current=window.requestAnimationFrame(()=>setSliding(true))})}
 const finishSlide=()=>{if(pending===null)return;setActive(pending);setPending(null);setSliding(false)}
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[])
 useEffect(()=>{if(active>=events.length){setActive(0);setPending(null);setSliding(false)}},[active,events.length])
 useEffect(()=>{if(events.length<2)return;timerRef.current=setInterval(()=>{if(!sliding&&pending===null)changeEvent(i=>(i+1)%events.length)},4000);return()=>window.clearInterval(timerRef.current)},[events.length,active,sliding,pending])
 useEffect(()=>()=>window.cancelAnimationFrame(frameRef.current),[])
 if(!events.length)return null
 const nextIndex=pending===null?(active+1)%events.length:pending
 return <section className="relative overflow-hidden bg-[#f5f8fc] py-16 sm:py-20"><div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/><div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-100/60 blur-3xl"/>
 <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
 <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-wayz-blue"><CalendarClock size={13}/> TIRUVANNAMALAI HIGHLIGHTS</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-wayz-ink sm:text-4xl">{data.heading||'Upcoming Events'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Stay in the loop with festivals and special days happening around our town.</p></div>
 <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-bold text-slate-500">{String(active+1).padStart(2,'0')} <span className="text-slate-300">/</span> {String(events.length).padStart(2,'0')} events</span><div className="flex gap-2"><button type="button" onClick={()=>changeEvent(i=>(i-1+events.length)%events.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-wayz-blue hover:text-wayz-blue" aria-label="Previous event"><ChevronLeft size={19}/></button><button type="button" onClick={()=>changeEvent(i=>(i+1)%events.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-wayz-blue hover:text-wayz-blue" aria-label="Next event"><ChevronRight size={19}/></button></div></div></div>
 <div className="mt-8 overflow-hidden"><div onTransitionEnd={finishSlide} className={"flex w-full "+(sliding?'transform -translate-x-1/2 transition-transform duration-500 ease-in-out':'translate-x-0 transition-none')} style={{width:'200%'}}><div className="w-1/2 shrink-0 pr-0"><EventCard event={events[active]} now={now} events={events} onSelect={changeEvent} active={active}/></div><div className="w-1/2 shrink-0 pl-0"><EventCard event={events[nextIndex]} now={now} events={events} onSelect={changeEvent} active={active}/></div></div></div>
 </div></section>
}
export default function HomePage(){
 const cms=useHomepageSections(),location=useLocation()
 const [destination,setDestination]=useState(()=>location.state?.destination || null)
 const placesCarouselRef=useRef(null)
 const scrollPlaces=direction=>{const el=placesCarouselRef.current;if(!el)return;const card=el.querySelector(':scope > button');el.scrollBy({left:direction*(card?.getBoundingClientRect().width||el.clientWidth),behavior:'smooth'})}
 useEffect(()=>{const el=placesCarouselRef.current;if(!el||featuredPlaces.length<2)return;const timer=window.setInterval(()=>{const card=el.querySelector(':scope > button');if(!card)return;const step=card.getBoundingClientRect().width+16;const max=el.scrollWidth-el.clientWidth;if(el.scrollLeft+el.clientWidth>=max-12)el.scrollTo({left:0,behavior:'smooth'});else el.scrollBy({left:step,behavior:'smooth'})},4500);return()=>window.clearInterval(timer)},[cms['nearby-places'].places?.length])
 useEffect(()=>{if(destination){const timer=window.setTimeout(()=>document.getElementById('book')?.scrollIntoView({behavior:'smooth',block:'center'}),300);return()=>window.clearTimeout(timer)}},[destination])
 const benefits=cms.benefits.items||[]
 const steps=cms['how-it-works'].steps||[]
 const places=(cms['nearby-places'].places||[]).filter(place=>typeof place==='string'||place.isPublished!==false)
 const featuredPlaces=places.slice(0,4)
 const drivers=cms.drivers.benefits||[]
 return <div className="min-h-screen overflow-x-clip bg-white"><SiteHeader/><main>
 <Hero data={cms['hero-banner']} destination={destination}/>
 <section className="relative overflow-hidden border-b border-slate-100 bg-[#f5f8fc] py-12 sm:py-16"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/><div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl"/><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-8 flex flex-col gap-2 sm:mb-9 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-wayz-blue">THE 2WAYZ ADVANTAGE</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-wayz-ink sm:text-3xl">Local rides, made easier.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Thoughtful features for getting around Tiruvannamalai, every day.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{benefits.map((item,i)=>{const Icon=iconMap[item.icon]||[Zap,CalendarClock,BadgeIndianRupee,ShieldCheck][i%4];const iconClass=i%4===1?'bg-amber-50 text-amber-600':i%4===2?'bg-emerald-50 text-emerald-600':i%4===3?'bg-violet-50 text-violet-600':'bg-blue-50 text-wayz-blue';return <article key={item.title||i} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_22px_rgba(15,45,80,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,45,80,0.11)] sm:p-6"><div className="flex items-start justify-between"><span className={"flex h-14 w-14 items-center justify-center rounded-2xl " + iconClass}><Icon size={27} strokeWidth={2.1}/></span><span className="text-xs font-bold tracking-widest text-slate-300">0{i+1}</span></div><h3 className="mt-5 text-base font-bold text-wayz-ink sm:text-lg">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p><div className="mt-5 h-1 w-10 rounded-full bg-wayz-yellow transition-all duration-300 group-hover:w-16"/></article>})}</div></div></section>
 <section id="how-it-works" className="relative overflow-hidden bg-white py-16 sm:py-20"><div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-blue-50 blur-3xl"/><div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-amber-50/70 blur-3xl"/><div className="relative mx-auto max-w-7xl px-5 lg:px-8"><SectionTitle eyebrow={cms['how-it-works'].eyebrow} heading={cms['how-it-works'].heading} description={cms['how-it-works'].description}/><div className="relative mt-12 grid gap-5 md:grid-cols-3 md:gap-6">{steps.map((step,i)=>{const Icon=[MapPin,Route,Smartphone][i%3];const accent=i===1?'bg-amber-50 text-amber-600':i===2?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-wayz-blue';return <article key={step.title||i} className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_28px_rgba(15,45,80,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(15,45,80,0.11)] sm:p-8"><div className="flex items-start justify-between"><span className={"flex h-16 w-16 items-center justify-center rounded-2xl " + accent}><Icon size={30} strokeWidth={1.9}/></span><span className="text-4xl font-black tracking-tight text-slate-100 transition-colors group-hover:text-blue-100">{String(i+1).padStart(2,'0')}</span></div><div className="mt-7"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-wayz-blue">STEP {String(i+1).padStart(2,'0')}</p><h3 className="mt-2 text-lg font-bold text-wayz-ink sm:text-xl">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{step.text}</p></div><div className="mt-auto flex items-center gap-2 pt-6"><span className="h-1 w-8 rounded-full bg-wayz-yellow transition-all duration-300 group-hover:w-14"/><span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">2WAYZ journey</span></div></article>})}</div></div></section>
 <section className="bg-wayz-mist/60 py-10 sm:py-14"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="relative overflow-hidden rounded-[28px] bg-[#073B83] px-6 py-8 text-white shadow-card sm:px-10 sm:py-10 lg:px-14"><svg aria-hidden="true" viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute -right-3 -top-5 hidden h-[290px] w-[250px] text-white opacity-[0.10] sm:block"><path d="M130 8 151 31 146 48 169 67 163 85 185 105 178 123 201 145 193 163 216 187 207 207 231 232 220 252 242 279H18L40 252 29 232 53 207 44 187 67 163 59 145 82 123 75 105 97 85 91 67 114 48 109 31 130 8Z" fill="currentColor"/><path d="M130 28V278M96 77H164M78 116H182M60 156H200M44 197H216M27 238H233M103 278V204Q130 174 157 204V278M112 278V216Q130 195 148 216V278" stroke="#073B83" strokeWidth="4"/><path d="M116 50H144M101 91H159M84 132H176M67 174H193M50 215H210" stroke="#073B83" strokeWidth="3"/><circle cx="130" cy="62" r="7" fill="#073B83"/><path d="M130 0V18M118 14H142" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div className="max-w-3xl"><p className="text-xs font-bold tracking-widest text-blue-200">YOUR SPIRITUAL VISIT STARTS HERE</p><h2 className="mt-4 text-2xl font-bold sm:text-4xl">{cms['darshan-promo'].heading === 'Planning a visit to Arunachaleswarar Temple?' ? 'Need a ticket for Dharshan?' : cms['darshan-promo'].heading}</h2><p className="mt-3 text-sm leading-7 text-blue-100">{cms['darshan-promo'].body}</p><p className="mt-3 text-xs text-blue-200">{cms['darshan-promo'].disclosure}</p></div><a href={cms['darshan-promo'].buttonUrl||'#'} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-bold text-wayz-ink">{cms['darshan-promo'].buttonText||'Learn more'} <ArrowRight size={18}/></a></div></div></div></section>
 <section className="relative overflow-hidden bg-[#f5f8fc] py-16 sm:py-20">
  <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl"/>
  <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl"/>
  <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-wayz-blue"><Sparkles size={13}/> EXPLORE TIRUVANNAMALAI</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-wayz-ink sm:text-4xl">{cms['nearby-places'].heading}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Discover well-loved temples, peaceful retreats and special places around our town.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 sm:hidden">
          <button type="button" onClick={()=>scrollPlaces(-1)} aria-label="Previous place" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-wayz-blue hover:text-wayz-blue"><ChevronLeft size={19}/></button>
          <button type="button" onClick={()=>scrollPlaces(1)} aria-label="Next place" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-wayz-blue hover:text-wayz-blue"><ChevronRight size={19}/></button>
        </div>
        <Link to="/places" className="inline-flex w-fit items-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#174f91]">View all <ArrowRight size={16}/></Link>
      </div>
    </div>
    <div ref={placesCarouselRef} className="mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 lg:grid-cols-4" style={{scrollbarWidth:'none'}}>
      {featuredPlaces.map((entry,i)=>{
        const place=typeof entry==='string'?{name:entry}:entry;
        const PlaceIcon=[Landmark,Mountain,Leaf,Sun,Sparkles,Landmark,Leaf,Mountain][i%8];
        return <button key={place.name||i} onClick={()=>{setDestination({name:place.name,searchText:place.name+', Tiruvannamalai, Tamil Nadu, India',address:place.name+', Tiruvannamalai, Tamil Nadu, India',placeId:null,location:null});document.getElementById('book')?.scrollIntoView({behavior:'smooth',block:'center'})}} className="group relative w-[86%] shrink-0 snap-center overflow-hidden rounded-[24px] border border-slate-200/80 bg-white text-left shadow-[0_8px_28px_rgba(15,45,80,0.055)] sm:w-auto sm:shrink transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(15,45,80,0.13)]">
          <div className="relative aspect-[5/4] overflow-hidden bg-[#e8f0fb]">
            {place.imageUrl||place.image
              ? <img src={mediaUrl(place.imageUrl||place.image)} alt={place.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"/>
              : <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#eaf2fc]">
                  <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[18px] border-white/35"/>
                  <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/35"/>
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/70 bg-white/65 text-wayz-blue shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"><PlaceIcon size={43} strokeWidth={1.5}/></div>
                  <span className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-[.2em] text-[#31577f]/70">Tiruvannamalai</span>
                </div>}
            <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-wayz-blue shadow-sm">{i===0?'Featured place':'Local favourite'}</div>
            <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-wayz-blue shadow-sm transition-all duration-300 group-hover:rotate-45 group-hover:bg-wayz-yellow"><ArrowUpRight size={18}/></span>
          </div>
          <div className="p-5">
            <h3 className="text-base font-bold leading-snug text-wayz-ink sm:text-[17px]">{place.name}</h3>
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

 <section id="drivers" className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-10 rounded-[30px] bg-wayz-navy p-7 text-white sm:p-10 lg:grid-cols-[1fr_.85fr] lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100"><HeartHandshake size={15} className="text-wayz-yellow"/>{cms.drivers.eyebrow}</span><h2 className="mt-5 text-3xl font-bold sm:text-4xl">{cms.drivers.heading}</h2><p className="mt-4 text-sm leading-7 text-blue-100">{cms.drivers.body}</p><Link to="/driver/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink">{cms.drivers.buttonText||'Join as a driver'} <ArrowRight size={17}/></Link></div><div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"><h3 className="text-lg font-bold">Why drive with 2WAYZ?</h3><div className="mt-5 space-y-4">{drivers.map((item,i)=><div key={i} className="flex gap-3 text-sm leading-6 text-blue-50"><CheckCircle2 className="mt-0.5 shrink-0 text-wayz-yellow" size={19}/>{item}</div>)}</div><div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4"><Wallet className="text-wayz-yellow" size={25}/><p className="text-xs leading-5 text-blue-50">Clear trip details and earning information, designed around local auto drivers.</p></div></div></div></div></section>
  <FaqSection/>
 </main><div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_28px_rgba(15,45,80,0.12)] backdrop-blur-sm lg:hidden"><a href="#book" className="mx-auto flex min-h-12 max-w-7xl items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 py-3 text-sm font-bold text-wayz-ink shadow-sm"><Zap size={17}/> Book an auto</a></div><SiteFooter/></div>
}
