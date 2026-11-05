import { useEffect, useState } from 'react'
import { Star, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

export default function DriverRatingsSummary() {
  const [data, setData] = useState({ averageRating: 0, totalRatings: 0, ratings: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    try { const result = await adminApi.driverRatings(); setData(result); setError('') }
    catch (err) { setError(err.message || 'Could not load driver ratings.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load(); const timer = window.setInterval(load, 60000); return () => window.clearInterval(timer) }, [])
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-wayz-blue">Passenger feedback</p><h2 className="mt-1 text-lg font-bold text-slate-900">Your driver rating</h2></div><button onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Refresh ratings"><RefreshCw size={16}/></button></div>
    <div className="mt-4 flex items-center gap-4"><div className="text-4xl font-bold text-slate-900">{loading ? '—' : data.averageRating.toFixed(1)}</div><div><div className="flex items-center gap-1 text-amber-500">{[1,2,3,4,5].map(n => <Star key={n} size={17} className={data.averageRating >= n ? 'fill-amber-400' : 'text-slate-200'}/>)}</div><p className="mt-1 text-xs text-slate-500">{data.totalRatings} passenger rating(s)</p></div></div>
    {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
    {data.ratings.length > 0 && <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">{data.ratings.slice(0,5).map(item => <div key={item.id}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-600">Ride {item.booking.reference}</span><span className="text-xs font-bold text-amber-600">{'★'.repeat(item.stars)}{'☆'.repeat(5-item.stars)}</span></div>{item.comment && <p className="mt-1 text-sm text-slate-700">{item.comment}</p>}{item.tags?.length > 0 && <p className="mt-1 text-xs text-slate-500">{item.tags.join(' · ')}</p>}</div>)}</div>}
    {!loading && !error && data.totalRatings === 0 && <p className="mt-3 text-sm text-slate-500">You haven't received any passenger ratings yet. Ratings appear here after completed rides.</p>}
  </section>
}
