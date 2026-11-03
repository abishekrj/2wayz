import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from './pages/HomePage'
import DriverRegistrationPage from './pages/DriverRegistrationPage'
import TravelDetailsPage from './pages/TravelDetailsPage'
import TravelTrackingPage from './pages/TravelTrackingPage'
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
      <Route path="/driver/register" element={<DriverRegistrationPage />} />
      <Route path="/travel-details" element={<TravelDetailsPage />} />
      <Route path="/travel-tracking" element={<TravelTrackingPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter></BookingProvider>
}
