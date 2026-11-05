import { useEffect, useState } from 'react'
import { Search, Users, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AdminRegisteredUsersPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ users: [], pagination: { total: 0, totalPages: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadUsers(nextPage = page, term = query) {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.users(term, nextPage)
      setData(result)
    } catch (err) {
      setError(err.message || 'Unable to load registered users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers(page, query) }, [page, query])

  function submitSearch(event) {
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-wayz-blue">User management</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">Registered Users</h1><p className="mt-2 text-sm text-slate-500">View passenger accounts created on 2WAYZ.</p></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><Users className="text-wayz-blue" size={20}/><div><p className="text-xs text-slate-500">Total registered</p><p className="text-xl font-bold text-wayz-ink">{data.pagination.total}</p></div></div>
      </div>

      <form onSubmit={submitSearch} className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={18} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or mobile number" className="h-11 w-full bg-transparent text-sm outline-none"/></div>
        <button className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Search</button>
        <button type="button" onClick={()=>loadUsers(page,query)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"><RefreshCw size={16}/>Refresh</button>
      </form>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-wayz-ink">Passenger accounts</h2><p className="mt-1 text-xs text-slate-500">Newest registrations appear first.</p></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading registered users…</p> : data.users.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-semibold text-slate-700">No registered users found</p><p className="mt-1 text-sm text-slate-500">{query ? 'Try a different name or mobile number.' : 'Users will appear here when they create an account through the registration page.'}</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Mobile number</th><th className="px-5 py-3">Registered on</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.users.map(user=><tr key={user.id}><td className="px-5 py-4 font-semibold text-slate-800">{user.name}</td><td className="px-5 py-4 text-slate-600">+91 {user.phone}</td><td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{user.isActive?'Active':'Inactive'}</span></td></tr>)}</tbody></table></div>
        )}
        {!loading && data.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">Page {page} of {data.pagination.totalPages}</p><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(value=>value-1)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button><button disabled={page>=data.pagination.totalPages} onClick={()=>setPage(value=>value+1)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button></div></div>}
      </div>
    </div>
  )
}
