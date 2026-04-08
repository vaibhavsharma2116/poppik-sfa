/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poppik: {
          green: '#2D5A27',
          beige: '#F5F5F0',
          black: '#1A1A1A',
          gold: '#C5A059'
        }
      }
    },
  },
  plugins: [],
}
