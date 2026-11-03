import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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
import { BookingProvider } from './context/BookingContext'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return <BookingProvider><BrowserRouter>
    <ScrollToTop />
    <Routes>
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
