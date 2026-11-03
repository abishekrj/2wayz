import { createContext, useContext, useState } from 'react'

const BookingContext = createContext(null)

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(null)
  return <BookingContext.Provider value={{ booking, setBooking }}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const value = useContext(BookingContext)
  if (!value) throw new Error('useBooking must be used inside BookingProvider')
  return value
}
