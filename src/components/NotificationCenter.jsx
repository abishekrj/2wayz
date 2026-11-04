import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const dateText = value => value ? new Date(value).toLocaleString('en-IN') : ''

export default function NotificationCenter({ role = 'PASSENGER' }) {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  const api = role === 'DRIVER'
    ? { load: adminApi.driverNotifications, read: adminApi.markDriverNotificationRead, readAll: adminApi.markAllDriverNotificationsRead }
    : { load: adminApi.passengerNotifications, read: adminApi.markPassengerNotificationRead, readAll: adminApi.markAllPassengerNotificationsRead }

  const load = useCallback(async () => {
    try {
      const result = await api.load()
      setItems(result.notifications || [])
      setUnread(result.unreadCount || 0)
      setError('')
    } catch (err) {
      if (!/sign in|log in/i.test(err.message || '')) setError(err.message || 'Notifications are unavailable.')
    }
  }, [api.load])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  async function markRead(item) {
    try {
      await api.read(item.id)
      setItems(current => current.map(value => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value))
      setUnread(value => Math.max(0, value - 1))
    } catch (err) { setError(err.message || 'Could not mark notification as read.') }
  }

  async function markAllRead() {
    try {
      await api.readAll()
      setItems(current => current.map(value => ({ ...value, readAt: value.readAt || new Date().toISOString() })))
      setUnread(0)
    } catch (err) { setError(err.message || 'Could not mark notifications as read.') }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Bell size={19} className="text-wayz-blue"/><h2 className="text-base font-extrabold text-wayz-ink">Notifications</h2>{unread > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{unread} new</span>}</div>{unread > 0 && <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-bold text-wayz-blue"><CheckCheck size={15}/> Mark all read</button>}</div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
    {items.length === 0 ? <p className="mt-4 text-sm text-slate-500">No notifications yet. New ride updates will appear here.</p> : <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{items.slice(0, 12).map(item => <article key={item.id} className={'rounded-xl border p-3 ' + (item.readAt ? 'border-slate-100 bg-white' : 'border-blue-100 bg-blue-50/70')}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-wayz-ink">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{dateText(item.createdAt)}</p></div>{!item.readAt && <button onClick={() => markRead(item)} className="shrink-0 text-xs font-bold text-wayz-blue">Mark read</button>}</div></article>)}</div>}
    <p className="mt-3 text-[10px] text-slate-400">Updates refresh automatically every 15 seconds while this page is open.</p>
  </section>
}
