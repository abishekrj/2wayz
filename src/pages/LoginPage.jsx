import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ phone: '', password: '' })
  const [message, setMessage] = useState('')

  function submit(event) {
    event.preventDefault()
    setMessage('Login is not connected to a server yet. The form is ready for authentication integration.')
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue booking local rides with 2WAYZ." footer={<>New to 2WAYZ? <Link to="/register" className="font-bold text-wayz-blue hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Mobile number</span><span className="flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100"><Phone size={17} className="mr-2 text-slate-400"/><span className="mr-2 border-r border-slate-200 pr-2 text-sm font-semibold text-slate-500">+91</span><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile number" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0"/></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Password</span><span className="flex h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100"><LockKeyhole size={17} className="mr-2 text-slate-400"/><input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-slate-400 focus:ring-0"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="ml-2 text-slate-400">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
        <div className="flex justify-end"><button type="button" onClick={() => setMessage('Password recovery will be available after authentication is connected.')} className="text-xs font-semibold text-wayz-blue hover:underline">Forgot password?</button></div>
        {message && <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">{message}</p>}
        <button type="submit" className="h-12 w-full rounded-xl bg-wayz-blue px-5 text-sm font-bold text-white shadow-sm hover:bg-wayz-navy">Login</button>
        <div className="border-t border-slate-100 pt-4 text-center"><span className="bg-white px-3 text-xs text-slate-400">OR</span></div>
        <button type="button" onClick={() => navigate('/driver/register')} className="h-12 w-full rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:border-wayz-blue hover:bg-blue-50">Register as an auto driver</button>
      </form>
    </AuthLayout>
  )
}