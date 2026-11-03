/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { wayz: { navy:'#073B83', blue:'#0B55B5', yellow:'#FFC928', ink:'#10213D', mist:'#F3F7FD' } }, fontFamily:{sans:['Poppins','sans-serif']}, boxShadow:{soft:'0 18px 55px rgba(5, 35, 80, .13)',card:'0 10px 35px rgba(5, 35, 80, .08)'} } },
  plugins: []
}