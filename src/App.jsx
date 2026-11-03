import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import DriverRegistrationPage from './pages/DriverRegistrationPage'
import TravelDetailsPage from './pages/TravelDetailsPage'
import TravelTrackingPage from './pages/TravelTrackingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import HowItWorksPage from './pages/HowItWorksPage'
import ForDriversPage from './pages/ForDriversPage'
import ContactPage from './pages/ContactPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSectionEditorPage from './pages/AdminSectionEditorPage'
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
      <Route index element={<AdminDashboardPage/>}/>
      <Route path="home-page/:slug" element={<AdminSectionEditorPage/>}/>
    </Route>
  </Routes>
}

export default function App() {
  return <BookingProvider><BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes/>}/>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/drivers" element={<ForDriversPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/driver/register" element={<DriverRegistrationPage />} />
      <Route path="/travel-details" element={<TravelDetailsPage />} />
      <Route path="/travel-tracking" element={<TravelTrackingPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter></BookingProvider>
}
