import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Plus, Pencil, ExternalLink } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api').replace(/\/api\/?$/, '')

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState([])
  const [payments, setPayments] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [tab, setTab] = useState('payments')
  const [editing, setEditing] = useState('')
  const [form, setForm] = useState({ name: '', description: '', durationDays: '30', price: '', isActive: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadPlans = useCallback(async () => setPlans((await adminApi.adminSubscriptionPlans()).plans || []), [])
  const loadPayments = useCallback(async () => setPayments((await adminApi.adminSubscriptionPayments(status === 'ALL' ? '' : status)).payments || []), [status])
  useEffect(() => { loadPlans().catch(e => setError(e.message)) }, [loadPlans])
  useEffect(() => { loadPayments().catch(e => setError(e.message)) }, [loadPayments])

  function resetForm() { setEditing(''); setForm({ name: '', description: '', durationDays: '30', price: '', isActive: true }) }
  function editPlan(plan) { setEditing(plan.id); setForm({ name: plan.name, description: plan.description || '', durationDays: String(plan.durationDays), price: String(plan.price), isActive: plan.isActive }); setTab('plans') }
  async function savePlan(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const data = { ...form, durationDays: Number(form.durationDays), price: Number(form.price) }
      const result = editing ? await adminApi.updateSubscriptionPlan(editing, data) : await adminApi.createSubscriptionPlan(data)
      setNotice(result.message); resetForm(); await loadPlans()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function review(payment, decision) {
    const reviewNote = decision === 'REJECTED' ? window.prompt('Reason for rejecting this payment?') : ''
    if (decision === 'REJECTED' && (!reviewNote || reviewNote.trim().length < 5)) return
    setBusy(true); setError(''); setNotice('')
    try { const result = await adminApi.reviewSubscriptionPayment(payment.id, { status: decision, reviewNote }); setNotice(result.message); await loadPayments() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-wayz-blue">Driver billing</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">Subscription Management</h1><p className="mt-2 text-sm text-slate-500">Configure plans and manually verify driver subscription payments.</p></div><button onClick={() => Promise.all([loadPlans(), loadPayments()]).catch(e => setError(e.message))} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><RefreshCw size={16}/>Refresh</button></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    <div className="mt-7 flex gap-2 border-b pb-3"><button onClick={() => setTab('payments')} className={'rounded-lg px-4 py-2 text-sm font-bold '+(tab==='payments'?'bg-wayz-blue text-white':'bg-white text-slate-600')}>Payment requests</button><button onClick={() => setTab('plans')} className={'rounded-lg px-4 py-2 text-sm font-bold '+(tab==='plans'?'bg-wayz-blue text-white':'bg-white text-slate-600')}>Subscription plans</button></div>
    {tab === 'plans' ? <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
      <section className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Available plans</h2><span className="text-xs text-slate-500">{plans.length} plans</span></div><div className="mt-4 space-y-3">{plans.map(plan => <article key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-bold text-wayz-ink">{plan.name} · {money(plan.price)}</p><p className="text-sm text-slate-500">{plan.durationDays} days {plan.description ? '· '+plan.description : ''}</p><span className={'mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold '+(plan.isActive?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}>{plan.isActive?'Active':'Hidden'}</span></div><button onClick={() => editPlan(plan)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><Pencil size={14}/>Edit</button></article>)}{!plans.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Create your first subscription plan.</p>}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">{editing?'Edit subscription plan':'Create subscription plan'}</h2><form onSubmit={savePlan} className="mt-4 space-y-3">
        <label className="block text-sm font-semibold text-slate-600">Plan name<input required maxLength={80} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} className="mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"/></label>
        <label className="block text-sm font-semibold text-slate-600">Description<input maxLength={300} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} className="mt-1.5 h-11 w-full rounded-lg border px-3 text-sm" placeholder="Optional"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-slate-600">Validity (days)<input required type="number" min="1" max="730" value={form.durationDays} onChange={e=>setForm(v=>({...v,durationDays:e.target.value}))} className="mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"/></label><label className="block text-sm font-semibold text-slate-600">Price (₹)<input required type="number" min="0" max="100000" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))} className="mt-1.5 h-11 w-full rounded-lg border px-3 text-sm"/></label></div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={form.isActive} onChange={e=>setForm(v=>({...v,isActive:e.target.checked}))}/>Visible to drivers</label>
        <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-wayz-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{busy?'Saving…':editing?'Update plan':'Create plan'}</button>{editing&&<button type="button" onClick={resetForm} className="rounded-lg border px-4 py-3 text-sm font-semibold">Cancel</button>}</div>
      </form></section>
    </div> : <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Driver payment requests</h2><select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All statuses</option></select></div>
      <div className="mt-4 space-y-3">{payments.map(payment=><article key={payment.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold text-wayz-ink">{payment.driver?.name} · {money(payment.amount)}</p><p className="text-sm text-slate-500">{payment.driver?.phone} · {payment.driver?.vehicleNumber}</p><p className="mt-2 text-sm">Plan: <strong>{payment.planName}</strong> ({payment.durationDays} days)</p><p className="text-sm">Payment method: <strong>{payment.paymentMethod}</strong>{payment.paymentReference?' · Reference: '+payment.paymentReference:''}</p><p className="mt-1 text-xs text-slate-400">{new Date(payment.createdAt).toLocaleString('en-IN')}</p>{payment.reviewNote&&<p className="mt-2 text-sm text-rose-700">Review note: {payment.reviewNote}</p>}</div><span className={'h-fit rounded-full px-3 py-1 text-xs font-bold '+(payment.status==='APPROVED'?'bg-emerald-50 text-emerald-700':payment.status==='REJECTED'?'bg-rose-50 text-rose-700':'bg-amber-50 text-amber-700')}>{payment.status}</span></div>
      {payment.proofUrl&&<a href={apiOrigin+payment.proofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-wayz-blue">View payment proof <ExternalLink size={14}/></a>}
      {payment.status==='PENDING'&&<div className="mt-4 flex gap-2"><button disabled={busy} onClick={()=>review(payment,'APPROVED')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><CheckCircle2 size={16}/>Verify & activate</button><button disabled={busy} onClick={()=>review(payment,'REJECTED')} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700"><XCircle size={16}/>Reject</button></div>}</article>)}
      {!payments.length&&<p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No payment requests found.</p>}</div>
    </section>}
  </div>
}
