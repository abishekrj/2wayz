import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Phone, UserRound } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { adminApi } from '../lib/adminApi'

export default function RegisterPage() {
  const location = useLocation()
  const requestedReturnTo = new URLSearchParams(location.search).get('returnTo')
  const returnTo = requestedReturnTo === '/travel-details' ? requestedReturnTo : '/'
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirmPassword: '', terms: false })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  function update(field, value) { setForm(current => ({ ...current, [field]: value })) }

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match. Please check and try again.')
    if (form.password.length < 8) return setError('Password must contain at least 8 characters.')
    if (!form.terms) return setError('Please accept the terms to continue.')
    setSubmitting(true)
    try {
      const result = await adminApi.registerUser(form.name, form.phone, form.password)
      setMessage(`${result.message || 'Your account has been created successfully.'} Please log in to continue${returnTo === '/travel-details' ? ' with your ride request' : ''}.`)
      setForm({ name: '', phone: '', password: '', confirmPassword: '', terms: false })
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join 2WAYZ and make your local journeys simpler." footer={<>Already have an account? <Link to={`/login${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} className="font-bold text-wayz-blue hover:underline">Login</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span><span className="flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100"><UserRound size={17} className="mr-2 text-slate-400"/><input required minLength={2} maxLength={100} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Enter your name" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0"/></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Mobile number</span><span className="flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100"><Phone size={17} className="mr-2 text-slate-400"/><span className="mr-2 border-r border-slate-200 pr-2 text-sm font-semibold text-slate-500">+91</span><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0"/></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><span className="flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100"><LockKeyhole size={17} className="mr-2 text-slate-400"/><input required minLength={8} maxLength={128} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="At least 8 characters" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="text-slate-400">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span><input required minLength={8} maxLength={128} type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Re-enter your password" className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-wayz-blue focus:ring-4 focus:ring-blue-100"/></label>
        <label className="flex items-start gap-2 text-xs leading-5 text-slate-500"><input type="checkbox" checked={form.terms} onChange={e => update('terms', e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#073b83]"/><span>I agree to the 2WAYZ terms of service and privacy policy.</span></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">{message}</p>}
        <button disabled={submitting} type="submit" className="h-12 w-full rounded-xl bg-wayz-blue px-5 text-sm font-bold text-white shadow-sm hover:bg-wayz-navy disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Creating account…':'Create account'}</button>
      </form>
    </AuthLayout>
  )
}
