import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Download, RefreshCw, Search, TrendingUp, Wallet, CarFront, Ban } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const localDate = date => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}
const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const initialFrom = localDate(firstOfMonth)
const initialTo = localDate(today)

function downloadCsv(rows, from, to) {
  const columns = [
    ['Driver', row => row.name], ['Mobile', row => row.phone], ['Vehicle', row => row.vehicleNumber],
    ['Status', row => row.status], ['Completed rides', row => row.completedRides],
    ['Cancelled rides', row => row.cancelledRides], ['Accepted offers', row => row.acceptedOffers],
    ['Declined offers', row => row.declinedOffers], ['Final fares', row => row.finalFares],
    ['Commission amount', row => row.commissionAmount], ['Commission deducted', row => row.commissionDeducted],
    ['Outstanding commission', row => row.outstandingCommission]
  ]
  const quote = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
  const csv = [columns.map(([label]) => quote(label)).join(','), ...rows.map(row => columns.map(([, get]) => quote(get(row))).join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = '2wayz-driver-performance-' + from + '-to-' + to + '.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function Metric({ label, value, detail, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{label}</p><Icon size={18} className="text-wayz-blue"/></div>
    <p className="mt-3 text-2xl font-extrabold tracking-tight text-wayz-ink">{value}</p>
    {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
  </div>
}

export default function AdminDriverReportsPage() {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [driverId, setDriverId] = useState('')
  const [search, setSearch] = useState('')
  const [drivers, setDrivers] = useState([])
  const [driverOptions, setDriverOptions] = useState([])
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setBusy(true)
    setError('')
    try {
      const result = await adminApi.driverReports(from, to, driverId)
      setSummary(result.summary)
      setDrivers(result.drivers || [])
      setDaily(result.daily || [])
    } catch (err) {
      setError(err.message || 'Unable to load driver reports.')
      setSummary(null)
    } finally {
      setLoading(false)
      setBusy(false)
    }
  }, [from, to, driverId])

  useEffect(() => {
    adminApi.adminDrivers().then(result => setDriverOptions(result.drivers || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const visibleDrivers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return drivers.filter(driver => !q || [driver.name, driver.phone, driver.vehicleNumber, driver.serviceArea].some(value => String(value || '').toLowerCase().includes(q)))
  }, [drivers, search])

  function chooseToday() {
    const value = localDate(new Date())
    setFrom(value); setTo(value)
  }
  function chooseMonth() {
    const now = new Date()
    setFrom(localDate(new Date(now.getFullYear(), now.getMonth(), 1)))
    setTo(localDate(now))
  }
  const hasRows = visibleDrivers.length > 0

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Performance analytics</p>
        <h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">Driver Performance & Reports</h1>
        <p className="mt-2 text-sm text-slate-500">Review completed rides, driver responses, fares and wallet commission.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => load(true)} disabled={busy || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>Refresh</button>
        <button onClick={() => downloadCsv(visibleDrivers, from, to)} disabled={!summary || !visibleDrivers.length} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Download size={16}/>Export CSV</button>
      </div>
    </div>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-wayz-ink"><CalendarDays size={18}/>Report period</h2>
        <div className="flex gap-2">
          <button onClick={chooseToday} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Today</button>
          <button onClick={chooseMonth} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">This month</button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-slate-600">FROM DATE<input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"/></label>
        <label className="text-xs font-bold text-slate-600">TO DATE<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal"/></label>
        <label className="text-xs font-bold text-slate-600">DRIVER<select value={driverId} onChange={e => setDriverId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"><option value="">All drivers</option>{driverOptions.map(driver => <option key={driver.id} value={driver.id}>{driver.name} · {driver.vehicleNumber}</option>)}</select></label>
      </div>
    </section>

    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-6 rounded-xl border bg-white p-8 text-sm text-slate-500">Loading performance report…</p> : summary && <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold text-wayz-ink">Period overview</h2><p className="text-xs text-slate-400">{from} to {to}</p></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ride requests" value={summary.totalRequests} detail="Requests created in this period" icon={CarFront}/>
        <Metric label="Completed rides" value={summary.totalCompleted} detail="Trips completed by drivers" icon={TrendingUp}/>
        <Metric label="Cancelled rides" value={summary.totalCancelled} detail="Cancelled booking records" icon={Ban}/>
        <Metric label="Total final fares" value={money(summary.totalFares)} detail={'Average fare ' + money(summary.averageFare)} icon={BarChart3}/>
        <Metric label="Commission amount" value={money(summary.totalCommission)} detail="Commission on rides completed in this period" icon={Wallet}/>
        <Metric label="Commission deducted" value={money(summary.totalDeducted)} detail="Settled amount recorded on these commission entries" icon={Wallet}/>
        <Metric label="Outstanding commission" value={money(summary.totalOutstanding)} detail="Current unpaid commission for listed drivers" icon={Wallet}/>
        <Metric label="Offer acceptance" value={summary.offerAcceptanceRate + '%'} detail={summary.totalAcceptedOffers + ' accepted · ' + summary.totalDeclinedOffers + ' declined'} icon={TrendingUp}/>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div><h2 className="font-extrabold text-wayz-ink">Driver-wise performance</h2><p className="mt-1 text-xs text-slate-500">Search drivers by name, mobile, vehicle or service area.</p></div>
          <div className="relative w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver records" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-wayz-blue"/></div>
        </div>
        {!hasRows ? <p className="p-8 text-center text-sm text-slate-500">No driver performance records match this filter.</p> :
          <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>
              <th className="px-4 py-3">Driver</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Cancelled</th><th className="px-4 py-3">Accepted</th><th className="px-4 py-3">Declined</th><th className="px-4 py-3">Final fares</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Deducted</th><th className="px-4 py-3">Outstanding</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{visibleDrivers.map(driver => <tr key={driver.id} className="hover:bg-slate-50">
              <td className="px-4 py-4"><p className="font-bold text-wayz-ink">{driver.name}</p><p className="mt-1 text-xs text-slate-500">{driver.phone} · {driver.vehicleNumber}</p></td>
              <td className="px-4 py-4 font-semibold text-emerald-700">{driver.completedRides}</td><td className="px-4 py-4">{driver.cancelledRides}</td><td className="px-4 py-4">{driver.acceptedOffers}</td><td className="px-4 py-4">{driver.declinedOffers}</td>
              <td className="px-4 py-4 font-semibold">{money(driver.finalFares)}</td><td className="px-4 py-4">{money(driver.commissionAmount)}</td><td className="px-4 py-4">{money(driver.commissionDeducted)}</td><td className="px-4 py-4 font-semibold text-amber-700">{money(driver.outstandingCommission)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 sm:p-5"><h2 className="font-extrabold text-wayz-ink">Daily ride summary</h2><p className="mt-1 text-xs text-slate-500">Daily completed rides, cancellations and final fares.</p></div>
        {daily.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No completed or cancelled rides in this period.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Cancelled</th><th className="px-4 py-3">Final fares</th></tr></thead><tbody className="divide-y divide-slate-100">{daily.map(day => <tr key={day.date}><td className="px-4 py-3 font-medium">{day.date}</td><td className="px-4 py-3 text-emerald-700">{day.completedRides}</td><td className="px-4 py-3">{day.cancelledRides}</td><td className="px-4 py-3 font-semibold">{money(day.fares)}</td></tr>)}</tbody></table></div>}
      </section>
      <p className="mt-4 text-[11px] leading-5 text-slate-400">Report dates use the booking completion date for completed rides and the booking last-updated date for cancelled rides (the current booking schema does not store a separate cancellation timestamp). Offer responses use their last-updated date. Commission deducted is read from commission transactions associated with rides completed in the selected period; outstanding commission is the current unpaid balance.</p>
    </>}
  </div>
}
