import { useCallback, useEffect, useState } from 'react'
import { Check, Clock3, RefreshCw, Users, X } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const statuses = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
]

export default function AdminDriversPage() {
  const [status, setStatus] = useState('PENDING')
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await adminApi.adminDrivers(status); setDrivers(result.drivers || []) }
    catch (err) { setError(err.message || 'Could not load drivers.') }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])
  async function changeStatus(driver, nextStatus) {
    setBusyId(driver.id); setError(''); setNotice('')
    try { const result = await adminApi.updateDriverStatus(driver.id, nextStatus); setNotice(result.message); await load() }
    catch (err) { setError(err.message || 'Could not update driver.') }
    finally { setBusyId('') }
  }
  return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Driver operations</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">Registered drivers</h1><p className="mt-2 text-sm text-slate-500">Review registrations and approve drivers before they can go online.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    <div className="mt-7 flex flex-wrap gap-2">{statuses.map(item => <button key={item.value} onClick={() => setStatus(item.value)} className={'rounded-full px-4 py-2 text-sm font-bold ' + (status === item.value ? 'bg-wayz-blue text-white' : 'border border-slate-200 bg-white text-slate-600')}>{item.label}</button>)}</div>
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading drivers…</div> : drivers.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Users className="mx-auto text-slate-400" size={32}/><p className="mt-3 font-bold text-slate-700">No drivers in this category</p><p className="mt-1 text-sm text-slate-500">New driver registrations will appear here.</p></div> : <div className="mt-5 space-y-4">{drivers.map(driver => <article key={driver.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-wayz-ink">{driver.name}</h2><span className={'rounded-full px-3 py-1 text-xs font-bold ' + (driver.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : driver.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>{driver.status}</span>{driver.isOnline && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Online</span>}</div><p className="mt-2 text-sm text-slate-600">{driver.phone} · {driver.serviceArea}</p><p className="mt-1 text-sm text-slate-600">Vehicle: <strong>{driver.vehicleNumber}</strong></p><p className="mt-1 text-sm text-slate-600">Driving licence: <strong>{driver.licenceNumber}</strong></p><p className="mt-2 text-xs text-slate-400">Registered {new Date(driver.createdAt).toLocaleString('en-IN')}</p>{driver.currentLat != null && <p className="mt-1 text-xs text-slate-500">Last GPS: {driver.currentLat.toFixed(5)}, {driver.currentLng.toFixed(5)} {driver.locationUpdatedAt ? '· ' + new Date(driver.locationUpdatedAt).toLocaleString('en-IN') : ''}</p>}</div>
      <div className="flex flex-wrap gap-2">{driver.status !== 'APPROVED' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'APPROVED')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Approve</button>}{driver.status !== 'REJECTED' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'REJECTED')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><X size={16}/> Reject</button>}{driver.status !== 'PENDING' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'PENDING')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"><Clock3 size={16}/> Set pending</button>}</div>
    </div></article>)}</div>}
  </div>
}
