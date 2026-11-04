import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock3, MapPin, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

function duration(value) {
  const total = Math.max(0, Math.floor(Number(value || 0) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}
function ageLabel(seconds) {
  if (seconds == null) return 'No GPS update'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
const eventLabels = {
  ONLINE: 'Went online', OFFLINE: 'Went offline', RIDE_ACCEPTED: 'Accepted a ride',
  RIDE_DECLINED: 'Declined a ride', DRIVER_ARRIVED: 'Arrived at pickup',
  TRIP_STARTED: 'Trip started', TRIP_COMPLETED: 'Trip completed'
}
const healthStyles = {
  HEALTHY: 'bg-emerald-50 text-emerald-700', DELAYED: 'bg-amber-50 text-amber-700',
  STALE: 'bg-red-50 text-red-700', NO_LOCATION: 'bg-slate-100 text-slate-600'
}

export default function AdminDriverOperationsPage() {
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [activities, setActivities] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setBusy(true)
    try {
      const result = await adminApi.driverOperations()
      setDrivers(result.drivers || [])
      setError('')
    } catch (err) { setError(err.message || 'Could not load driver operations.') }
    finally { setLoading(false); setBusy(false) }
  }, [])
  useEffect(() => {
    load()
    const timer = window.setInterval(() => load(true), 15000)
    return () => window.clearInterval(timer)
  }, [load])
  const openActivity = async driver => {
    setSelectedId(driver.id)
    setSelectedDriver(driver)
    setActivities([])
    try {
      const result = await adminApi.driverActivity(driver.id)
      setActivities(result.activities || [])
      setSelectedDriver(result.driver || driver)
    } catch (err) { setError(err.message || 'Could not load activity history.') }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return drivers.filter(driver => !q || [driver.name, driver.phone, driver.vehicleNumber, driver.serviceArea].some(v => String(v || '').toLowerCase().includes(q)))
  }, [drivers, search])
  const onlineCount = drivers.filter(d => d.isOnline).length
  const healthyCount = drivers.filter(d => d.locationHealth === 'HEALTHY').length
  const staleCount = drivers.filter(d => ['STALE', 'NO_LOCATION'].includes(d.locationHealth)).length
  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Driver management</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">Driver Operations</h1><p className="mt-2 text-sm text-slate-500">Monitor online sessions, GPS health and driver activity history.</p></div>
      <button onClick={() => load(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Approved drivers</p><p className="mt-2 text-2xl font-extrabold">{drivers.length}</p></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Currently online</p><p className="mt-2 text-2xl font-extrabold text-emerald-600">{onlineCount}</p></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Stale / missing GPS</p><p className="mt-2 text-2xl font-extrabold text-amber-600">{staleCount}</p><p className="mt-1 text-xs text-slate-400">{healthyCount} healthy GPS connections</p></div>
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.9fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b p-4"><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search driver, mobile or vehicle" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-wayz-blue"/></div></div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading driver records…</p> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No matching drivers.</p> :
          <div className="divide-y divide-slate-100">{filtered.map(driver=><button key={driver.id} onClick={()=>openActivity(driver)} className={`w-full p-4 text-left transition hover:bg-slate-50 ${selectedId===driver.id?'bg-blue-50':''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-wayz-ink">{driver.name}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${driver.isOnline?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{driver.isOnline?'ONLINE':'OFFLINE'}</span></div>
            <p className="mt-1 text-xs text-slate-500">{driver.phone} · {driver.vehicleNumber} · {driver.serviceArea}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <span className="flex items-center gap-1.5 text-slate-600"><Clock3 size={13}/>Today {duration(driver.onlineTodayMs)}</span>
              <span className="flex items-center gap-1.5 text-slate-600"><Wifi size={13}/>Total {duration(driver.totalOnlineMs)}</span>
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${healthStyles[driver.locationHealth]}`}><MapPin size={12}/>{driver.locationHealth.replace('_',' ')}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Last GPS: {ageLabel(driver.locationAgeSeconds)}</p>
          </button>)}</div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b p-4"><h2 className="font-bold text-wayz-ink">Activity history</h2><p className="mt-1 text-xs text-slate-500">{selectedDriver ? `${selectedDriver.name} · Latest 100 events` : 'Select a driver to view their activity.'}</p></div>
        {!selectedDriver ? <div className="p-8 text-center text-sm text-slate-400"><Activity size={26} className="mx-auto mb-2"/>Choose a driver from the list.</div> : activities.length === 0 ? <p className="p-6 text-sm text-slate-500">No activity events recorded yet. New events will appear as the driver uses 2WAYZ.</p> :
          <div className="max-h-[650px] overflow-y-auto p-4"><ol className="space-y-4">{activities.map(item=><li key={item.id} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-wayz-blue"/><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{eventLabels[item.eventType] || item.eventType}</p><p className="mt-0.5 text-xs text-slate-600">{item.description}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN')}</p></div></li>)}</ol></div>}
      </section>
    </div>
    <p className="mt-4 text-[11px] text-slate-400">Location health: healthy ≤60 seconds, delayed 61–180 seconds, stale over 180 seconds. Online duration is calculated from recorded online/offline events; older sessions before this feature was installed are not reconstructed.</p>
  </div>
}
