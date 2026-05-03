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
          pink: '#EC73AB',
          beige: '#F5F5F0',
          black: '#1A1A1A',
          gold: '#C5A059'
        }
      }
    },
  },
  plugins: [],
}
