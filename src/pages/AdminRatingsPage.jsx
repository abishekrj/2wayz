import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, Star, Eye, EyeOff } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState([])
  const [search, setSearch] = useState('')
  const [stars, setStars] = useState('')
  const [visible, setVisible] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [hiddenCount, setHiddenCount] = useState(0)
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await adminApi.adminRatings({ page, search, stars, visible }); setRatings(result.ratings || []); setPagination(result.pagination || { total: 0, totalPages: 1 }); setHiddenCount(result.hiddenCount || 0) }
    catch (err) { setError(err.message || 'Could not load ratings.') }
    finally { setLoading(false) }
  }, [page, search, stars, visible])
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])
  async function setVisibility(item, isVisible) {
    const moderationNote = notes[item.id] || ''
    if (!isVisible && moderationNote.trim().length < 5) { setError('Enter a moderation reason (at least 5 characters) before hiding a review.'); return }
    setBusyId(item.id); setError(''); setNotice('')
    try { const result = await adminApi.updateRatingVisibility(item.id, { isVisible, moderationNote }); setNotice(result.message || 'Review updated.'); await load() }
    catch (err) { setError(err.message || 'Could not update review.') }
    finally { setBusyId('') }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-wayz-blue">Passenger experience</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Ratings & Feedback</h1><p className="mt-1 text-sm text-slate-500">Review passenger feedback and moderate inappropriate content.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><RefreshCw size={16}/>Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Reviews in current filter</p><p className="mt-1 text-2xl font-bold text-slate-900">{pagination.total || 0}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Hidden reviews</p><p className="mt-1 text-2xl font-bold text-slate-900">{hiddenCount}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Moderation</p><p className="mt-1 text-sm font-semibold text-slate-800">Hidden reviews are excluded from driver averages.</p></div></div>
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={event => {setPage(1);setSearch(event.target.value)}} placeholder="Search booking, passenger, driver or comment" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"/></label><select value={stars} onChange={event => {setPage(1);setStars(event.target.value)}} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All ratings</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} stars</option>)}</select><select value={visible} onChange={event => {setPage(1);setVisible(event.target.value)}} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All visibility</option><option value="true">Visible</option><option value="false">Hidden</option></select></div>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading feedback…</p> : ratings.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No ratings match these filters.</div> : <div className="space-y-3">{ratings.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{item.passenger.name} · {item.passenger.phone}</p><p className="mt-1 text-xs text-slate-500">Driver: {item.driver.name} ({item.driver.vehicleNumber}) · Ride {item.booking.reference}</p><p className="mt-1 text-xs text-slate-400">{dateTime(item.createdAt)}</p></div><div className="flex items-center gap-1 text-amber-500">{[1,2,3,4,5].map(n => <Star key={n} size={17} className={n <= item.stars ? 'fill-amber-400' : 'text-slate-200'}/>)}</div></div>
      {item.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.tags.map(tag => <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{tag}</span>)}</div>}{item.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.comment}</p>}
      {!item.isVisible && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">Hidden: {item.moderationNote}</p>}
      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">{item.isVisible && <input value={notes[item.id] || ''} onChange={event => setNotes(current => ({...current,[item.id]:event.target.value}))} placeholder="Reason required to hide this review" maxLength={500} className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"/>}<button disabled={busyId === item.id} onClick={() => setVisibility(item,!item.isVisible)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{item.isVisible ? <><EyeOff size={15}/>Hide review</> : <><Eye size={15}/>Restore review</>}</button></div>
    </article>)}</div>}
    <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Page {page} of {pagination.totalPages || 1}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page>=(pagination.totalPages||1)} onClick={()=>setPage(value=>value+1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div>
  </div>
}
