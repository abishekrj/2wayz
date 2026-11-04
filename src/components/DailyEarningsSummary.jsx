import { useCallback, useEffect, useState } from 'react'
import { IndianRupee, RefreshCw, TrendingUp, CarFront, Wallet } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateLabel = value => value ? new Date(value + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Today'

function Metric({ label, value, tone = 'blue' }) {
  const tones = { blue: 'text-wayz-blue', green: 'text-emerald-700', amber: 'text-amber-700', ink: 'text-wayz-ink' }
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={'mt-2 text-2xl font-black ' + tones[tone]}>{value}</p></div>
}

export default function DailyEarningsSummary({ role = 'DRIVER' }) {
  const isAdmin = role === 'ADMIN'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try {
      const result = isAdmin ? await adminApi.adminDailyEarnings() : await adminApi.driverDailyEarnings()
      setData(result); setError('')
    } catch (err) { setError(err.message || 'Unable to load daily earnings.') }
    finally { setLoading(false) }
  }, [isAdmin])
  useEffect(() => {
    load()
    const timer = window.setInterval(load, 30000)
    return () => window.clearInterval(timer)
  }, [load])
  const summary = data?.summary || {}
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-wayz-blue">Daily earnings</p><h2 className="mt-1 text-lg font-extrabold text-wayz-ink">{dateLabel(data?.date)}</h2><p className="mt-1 text-xs text-slate-500">{isAdmin ? 'Completed rides across all drivers · IST' : 'Your completed rides · IST'}</p></div>
      <button type="button" onClick={load} disabled={loading} aria-label="Refresh daily earnings" className="rounded-lg p-2 text-wayz-blue hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={17}/></button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && !data ? <p className="mt-5 text-sm text-slate-500">Loading today's earnings…</p> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Completed rides" value={summary.completedRides || 0} tone="ink"/>
        <Metric label="Total customer fare" value={money(summary.totalFare)} tone="blue"/>
        <Metric label="2WAYZ commission" value={money(isAdmin ? summary.totalCommission : summary.commission)} tone="amber"/>
        <Metric label="Commission settled" value={money(isAdmin ? summary.commissionSettled : summary.commissionSettled)} tone="ink"/>
        <Metric label="Commission outstanding" value={money(isAdmin ? summary.commissionDue : summary.commissionDue)} tone="amber"/>
        <Metric label="Estimated net earnings" value={money(summary.netEarnings)} tone="green"/>
      </div>
      {isAdmin ? <>
        <div className="mt-5 flex items-center gap-2 text-sm font-extrabold text-wayz-ink"><CarFront size={17} className="text-wayz-blue"/> Driver-wise summary <span className="ml-auto text-xs font-semibold text-slate-400">{summary.activeDrivers || 0} drivers</span></div>
        {data?.drivers?.length ? <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Driver','Rides','Customer fare','Commission','Net earnings'].map(label=><th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.drivers.map(driver=><tr key={driver.driverId}><td className="px-4 py-3"><p className="font-bold text-slate-800">{driver.driverName}</p><p className="mt-1 text-slate-400">{driver.phone} · {driver.vehicleNumber}</p></td><td className="px-4 py-3 font-semibold">{driver.completedRides}</td><td className="px-4 py-3">{money(driver.totalFare)}</td><td className="px-4 py-3">{money(driver.commission)}</td><td className="px-4 py-3 font-extrabold text-emerald-700">{money(driver.netEarnings)}</td></tr>)}</tbody></table></div> : <p className="mt-3 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No completed rides recorded today.</p>}
      </> : <>
        <div className="mt-5 flex items-center gap-2 text-sm font-extrabold text-wayz-ink"><TrendingUp size={17} className="text-wayz-blue"/> Completed ride details</div>
        {data?.rides?.length ? <div className="mt-3 divide-y rounded-xl border border-slate-100">{data.rides.map((ride,index)=><div key={ride.reference + index} className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs"><div><p className="font-bold text-slate-800">{ride.reference}</p><p className="mt-1 text-slate-500">{ride.pickupName} → {ride.destinationName}</p><p className="mt-1 text-slate-400">{new Date(ride.completedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p></div><div className="text-right"><p className="font-extrabold text-emerald-700">{money(ride.netEarnings)} net</p><p className="mt-1 text-slate-500">Fare {money(ride.fare)} · Commission {money(ride.commission)}</p></div></div>)}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No completed rides yet today. Your earnings will appear here after you complete a trip.</p>}
      </>}
      <p className="mt-4 text-[11px] leading-5 text-slate-400">Net earnings are an estimate: completed customer fare minus 2WAYZ commission. Passengers pay drivers directly. Commission settlement is tracked separately in your wallet. Figures refresh every 30 seconds.</p>
    </>}
  </section>
}
