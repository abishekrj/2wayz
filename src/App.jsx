import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import DriverRegistrationPage from './pages/DriverRegistrationPage'
import DriverPortalPage from './pages/DriverPortalPage'
import AdminDriversPage from './pages/AdminDriversPage'
import TravelDetailsPage from './pages/TravelDetailsPage'
import TravelTrackingPage from './pages/TravelTrackingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSectionEditorPage from './pages/AdminSectionEditorPage'
import AdminCmsPageEditor from './pages/AdminCmsPageEditor'
import AdminRegisteredUsersPage from './pages/AdminRegisteredUsersPage'
import AdminWalletPage from './pages/AdminWalletPage'
import AdminLiveDriverMapPage from './pages/AdminLiveDriverMapPage'
import AdminDriverOperationsPage from './pages/AdminDriverOperationsPage'
import AdminDriverReportsPage from './pages/AdminDriverReportsPage'
import AdminCancellationsPage from './pages/AdminCancellationsPage'
import AdminNotificationsPage from './pages/AdminNotificationsPage'
import AdminScheduledRidesPage from './pages/AdminScheduledRidesPage'
import CmsContentPage from './pages/CmsContentPage'
import MyBookingsPage from './pages/MyBookingsPage'
import AdminLayout from './components/AdminLayout'
import { adminApi } from './lib/adminApi'
import { BookingProvider } from './context/BookingContext'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function AdminRoutes() {
  const [admin,setAdmin] = useState(null)
  const [checking,setChecking] = useState(true)
  useEffect(() => {
    let active = true
    adminApi.me().then(result => { if (active) setAdmin(result.admin) }).catch(() => { if (active) setAdmin(null) }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])
  if (checking) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking administrator session…</div>
  return <Routes>
    <Route path="login" element={<AdminLoginPage admin={admin} onLogin={setAdmin}/>}/>
    <Route path="/" element={admin ? <AdminLayout admin={admin}/> : <Navigate to="/admin/login" replace/>}>
      <Route index element={<Navigate to="/admin/dashboard" replace/>}/>
      <Route path="dashboard" element={<AdminDashboardPage/>}/>
      <Route path="registered-users" element={<AdminRegisteredUsersPage/>}/>
      <Route path="drivers" element={<AdminDriversPage/>}/>
      <Route path="live-map" element={<AdminLiveDriverMapPage/>}/>
      <Route path="driver-operations" element={<AdminDriverOperationsPage/>}/>
      <Route path="driver-reports" element={<AdminDriverReportsPage/>}/>
      <Route path="wallet" element={<AdminWalletPage/>}/>
      <Route path="cancellations" element={<AdminCancellationsPage/>}/>
      <Route path="scheduled-rides" element={<AdminScheduledRidesPage/>}/>
      <Route path="notifications" element={<AdminNotificationsPage/>}/>
      <Route path="home-page/:slug" element={<AdminSectionEditorPage/>}/>
      <Route path="cms-pages/:slug" element={<AdminCmsPageEditor/>}/>
    </Route>
  </Routes>
}

export default function App() {
  return <BookingProvider><BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes/>}/>
      <Route path="/" element={<HomePage />} />
      <Route path="/:slug" element={<CmsContentPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/driver/register" element={<DriverRegistrationPage />} />
      <Route path="/driver/login" element={<DriverPortalPage />} />
      <Route path="/driver" element={<DriverPortalPage />} />
      <Route path="/travel-details" element={<TravelDetailsPage />} />
      <Route path="/travel-tracking" element={<TravelTrackingPage />} />
      <Route path="/my-bookings" element={<MyBookingsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter></BookingProvider>
}
