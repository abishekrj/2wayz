import { useEffect, useState } from 'react'
import { CalendarClock, UploadCloud, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function DriverSubscriptionPanel() {
  const [data, setData] = useState({ plans: [], payments: [], subscription: null, isSubscribed: false })
  const [planId, setPlanId] = useState('')
  const [method, setMethod] = useState('UPI')
  const [reference, setReference] = useState('')
  const [proof, setProof] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function load() { setData(await adminApi.driverSubscriptionMe()) }
  useEffect(() => { load().catch(e => setError(e.message)) }, [])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData()
      form.append('planId', planId)
      form.append('paymentMethod', method)
      form.append('paymentReference', reference)
      if (proof) form.append('proof', proof)
      const result = await adminApi.submitSubscriptionPayment(form)
      setNotice(result.message); setReference(''); setProof(null); setPlanId(''); event.target.reset(); await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-wayz-blue">Driver membership</p><h2 className="mt-1 text-xl font-bold text-wayz-ink">2WAYZ Subscription</h2><p className="mt-1 text-sm text-slate-500">Pay manually and request Super Admin confirmation.</p></div><button onClick={()=>load().catch(e=>setError(e.message))} aria-label="Refresh subscription" className="rounded-lg p-2 text-wayz-blue hover:bg-blue-50"><RefreshCw size={18}/></button></div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {data.subscription?<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-800">Subscription active · {data.subscription.planName}</p><p className="mt-1 text-sm text-emerald-700">Valid until {dateLabel(data.subscription.expiresAt)}</p><p className="mt-1 text-xs text-emerald-700">Renew early to extend your current expiry date.</p></div>:<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">No active subscription</p><p className="mt-1 text-sm text-amber-800">Choose a plan and submit your payment. Your subscription becomes active only after Super Admin verification.</p></div>}
    {data.payments.some(item=>item.status==='PENDING')?<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Payment verification pending</p><p className="mt-1 text-sm text-amber-800">Your subscription request is with the Super Admin. You can submit another request after this one is approved or rejected.</p></div>:data.plans.length>0?<form onSubmit={submit} className="mt-5 space-y-3">
      <label className="block text-sm font-semibold text-slate-600">Choose a subscription plan<select required value={planId} onChange={e=>setPlanId(e.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Select a plan</option>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name} · {plan.durationDays} days · {money(plan.price)}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-600">Payment method<select value={method} onChange={e=>setMethod(e.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="UPI">UPI payment</option><option value="CASH">Cash paid to 2WAYZ representative</option></select></label>{method==='UPI'&&<label className="block text-sm font-semibold text-slate-600">UPI transaction reference<input required minLength={4} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Enter UPI reference"/></label>}</div>
      <label className="block text-sm font-semibold text-slate-600">Payment screenshot (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)} className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2 text-sm"/></label>
      <button disabled={busy||!planId} className="inline-flex items-center gap-2 rounded-lg bg-wayz-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><UploadCloud size={16}/>{busy?'Submitting…':'Submit payment for verification'}</button>
    </form>:<p className="mt-5 rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No subscription plans are available yet. Please contact 2WAYZ.</p>}
    {data.payments.length>0&&<div className="mt-5"><h3 className="text-sm font-bold text-wayz-ink">Payment request history</h3><div className="mt-2 divide-y rounded-xl border">{data.payments.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{item.planName} · {money(item.amount)} · {dateLabel(item.createdAt)}</span><strong className={item.status==='APPROVED'?'text-emerald-700':item.status==='REJECTED'?'text-rose-700':'text-amber-700'}>{item.status}</strong>{item.reviewNote&&<p className="w-full text-xs text-rose-700">{item.reviewNote}</p>}</div>)}</div></div>}
  </section>
}
