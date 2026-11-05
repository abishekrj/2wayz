import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const dateText = value => value ? new Date(value).toLocaleString('en-IN') : ''

export default function AdminNotificationsPage() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const result = await adminApi.adminNotifications()
      setItems(result.notifications || [])
      setUnread(result.unreadCount || 0)
    } catch (err) { setError(err.message || 'Unable to load notifications.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  async function markRead(item) {
    try {
      await adminApi.markAdminNotificationRead(item.id)
      setItems(current => current.map(value => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value))
      setUnread(value => Math.max(0, value - 1))
    } catch (err) { setError(err.message || 'Could not mark notification as read.') }
  }

  async function markAllRead() {
    try {
      await adminApi.markAllAdminNotificationsRead()
      setItems(current => current.map(value => ({ ...value, readAt: value.readAt || new Date().toISOString() })))
      setUnread(0)
    } catch (err) { setError(err.message || 'Could not mark notifications as read.') }
  }

  return <div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">System activity</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">Notifications & Alerts</h1><p className="mt-2 text-sm text-slate-500">Ride requests, driver assignments, trip status updates, and cancellations.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button></div>
    <div className="mt-6 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-3"><Bell className="text-wayz-blue"/><div><p className="text-sm font-bold text-wayz-ink">{unread} unread alert{unread === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-slate-600">This page refreshes every 15 seconds.</p></div></div>{unread > 0 && <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-bold text-wayz-blue"><CheckCheck size={15}/> Mark all read</button>}</div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading notifications…</p> : items.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No alerts yet. New ride activity will appear here.</p> : <div className="divide-y divide-slate-100">{items.map(item => <article key={item.id} className={'flex flex-wrap items-start justify-between gap-3 p-5 ' + (item.readAt ? '' : 'bg-blue-50/50')}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-wayz-ink">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">NEW</span>}</div><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{dateText(item.createdAt)}{item.type ? ' · ' + item.type.replaceAll('_', ' ') : ''}</p></div>{!item.readAt && <button onClick={() => markRead(item)} className="text-xs font-bold text-wayz-blue">Mark read</button>}</article>)}</div>}</div>
    <p className="mt-3 text-xs text-slate-500">Showing the 100 most recent admin notifications. These are in-app alerts; SMS, WhatsApp, and push notifications are not configured in this stage.</p>
  </div>
}
