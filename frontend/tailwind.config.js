/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gad: {
          azul:  '#1A3A5C',
          amber: '#E8A020',
        }
      }
    },
  },
  plugins: [],
}
