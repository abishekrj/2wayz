import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import InfoPageLayout from '../components/InfoPageLayout'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
export default function CmsContentPage() {
 const {slug}=useParams(),[page,setPage]=useState(null),[loading,setLoading]=useState(true)
 useEffect(()=>{let active=true;setLoading(true);fetch(`${API_BASE}/cms-pages/public`).then(r=>{if(!r.ok)throw new Error('Unable to load page');return r.json()}).then(data=>{if(active)setPage((data.pages||[]).find(item=>item.slug===slug)||null)}).catch(()=>{if(active)setPage(null)}).finally(()=>active&&setLoading(false));return()=>{active=false}},[slug])
 if(loading)return <div className="min-h-screen bg-wayz-mist p-10 text-center text-sm text-slate-500">Loading page…</div>
 if(!page)return <InfoPageLayout eyebrow="2WAYZ" title="Page unavailable" intro="This page may have been unpublished or moved."><Link to="/" className="font-bold text-wayz-blue">Return to home</Link></InfoPageLayout>
 const data=page.content||{}
 return <InfoPageLayout eyebrow={data.eyebrow||page.navLabel} title={page.title} intro={data.intro||''}>
   {Array.isArray(data.sections)&&<div className="grid gap-5 sm:grid-cols-2">{data.sections.map((section,index)=><article key={index} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm"><h2 className="text-lg font-extrabold text-wayz-ink">{section.heading}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{section.text}</p></article>)}</div>}
   {data.notice&&<p className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">{data.notice}</p>}
   {data.ctaTitle&&<section className="mt-10 rounded-3xl bg-wayz-navy p-7 text-white sm:p-9"><h2 className="text-2xl font-extrabold">{data.ctaTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">{data.ctaText}</p><Link to={data.ctaUrl||'/driver/register'} className="mt-7 inline-flex rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink">{data.ctaButton||'Learn more'}</Link></section>}
 </InfoPageLayout>
}
