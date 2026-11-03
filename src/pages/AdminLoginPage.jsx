import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

export default function AdminLoginPage({ admin, onLogin }) {
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)
  const navigate = useNavigate()
  if (admin) return <Navigate to="/admin" replace/>
  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true)
    try { const result = await adminApi.login(email,password); onLogin(result.admin); navigate('/admin',{replace:true}) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  return <div className="flex min-h-screen items-center justify-center bg-[#f3f7fd] px-4 py-10">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#073b83] p-10 text-white md:flex"><div><p className="text-2xl font-extrabold tracking-wider">2WAYZ</p><p className="mt-2 text-xs font-semibold uppercase tracking-[.2em] text-blue-200">Super Admin</p></div><div><ShieldCheck size={42} className="text-wayz-yellow"/><h1 className="mt-5 text-3xl font-extrabold leading-tight">Manage your website.<br/>Your way.</h1><p className="mt-4 text-sm leading-7 text-blue-100">Control homepage content and keep your 2WAYZ website up to date from one place.</p></div><p className="text-xs text-blue-200">Secure administrator access</p></div>
      <div className="p-7 sm:p-10 lg:p-14"><div className="mb-8 md:hidden"><p className="text-2xl font-extrabold text-wayz-navy">2WAYZ <span className="text-wayz-blue">ADMIN</span></p></div><div className="mb-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><LockKeyhole/></div><h2 className="mt-5 text-2xl font-extrabold text-wayz-ink">Admin sign in</h2><p className="mt-2 text-sm text-slate-500">Enter your administrator credentials to continue.</p></div>
        <form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span><span className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue"><Mail size={18} className="text-slate-400"/><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@2wayz.in" className="h-12 w-full bg-transparent px-3 text-sm outline-none"/></span></label><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-wayz-blue"/></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-wayz-blue text-sm font-bold text-white transition hover:bg-wayz-navy disabled:opacity-60">{loading?'Signing in…':'Sign in to dashboard'}</button>
        </form><p className="mt-8 text-center text-xs text-slate-400">Authorised 2WAYZ administrators only</p>
      </div>
    </div>
  </div>
}