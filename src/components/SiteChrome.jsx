import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ChevronDown, MapPin } from 'lucide-react'
import Brand from './Brand'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="relative z-30 border-b border-slate-100 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><Brand/><nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex"><Link className="text-wayz-blue" to="/">Home</Link><a className="transition hover:text-wayz-blue" href="#about">About</a><a className="transition hover:text-wayz-blue" href="#how-it-works">How it works</a><a className="transition hover:text-wayz-blue" href="#drivers">For drivers</a><a className="transition hover:text-wayz-blue" href="#contact">Contact</a></nav><div className="hidden md:block"><button className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wayz-navy">Login / Sign up <ChevronDown className="ml-1 inline" size={15}/></button></div><button aria-label="Toggle navigation" onClick={()=>setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 p-2 text-wayz-navy md:hidden">{menuOpen?<X/>:<Menu/>}</button></div>
    {menuOpen&&<nav className="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 text-sm font-semibold md:hidden">{['Home','About','How it works','For drivers','Contact'].map((item,i)=><a key={item} onClick={()=>setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-wayz-mist" href={['#','#about','#how-it-works','#drivers','#contact'][i]}>{item}</a>)}<button className="mt-1 rounded-xl bg-wayz-blue px-4 py-3 text-left text-white">Login / Sign up</button></nav>}</header>
  )
}

import { MapPin } from 'lucide-react'
import Brand from './Brand'

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-[#052f6c] text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8"><div><Brand light/><p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">Your local mobility partner in Tiruvannamalai. Ride local. Reach easy.</p></div><div><h3 className="font-bold">Explore</h3><div className="mt-4 grid gap-3 text-sm text-blue-100"><a href="#about" className="hover:text-wayz-yellow">About 2WAYZ</a><a href="#how-it-works" className="hover:text-wayz-yellow">How it works</a><a href="#drivers" className="hover:text-wayz-yellow">For drivers</a></div></div><div><h3 className="font-bold">Get in touch</h3><p className="mt-4 text-sm text-blue-100">Tiruvannamalai, Tamil Nadu</p><p className="mt-3 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin size={16}/> Tiruvannamalai, Tamil Nadu</p></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-blue-200 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© {new Date().getFullYear()} 2WAYZ. All rights reserved.</span><span>Local mobility. Made simple.</span></div></div></footer>
  )
}
