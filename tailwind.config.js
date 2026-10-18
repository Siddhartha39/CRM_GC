/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fdfbf7',
        foreground: '#2d2d2d',
        muted: '#e5e0d8',
        accent: '#ff4d4d',
        border: '#2d2d2d',
        'secondary-accent': '#2d5da1',
        'paper-white': '#ffffff',
        'sticky-yellow': '#fff9c4',
        success: '#2e7d32',
        warning: '#a66a00',
        danger: '#c62828',
      },
      fontFamily: {
        heading: ['Kalam', 'cursive', 'sans-serif'],
        body: ['Patrick Hand', 'cursive', 'sans-serif'],
        sans: ['Patrick Hand', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        'hand': '4px 4px 0 #2d2d2d',
        'hand-lg': '8px 8px 0 #2d2d2d',
        'hand-sm': '2px 2px 0 #2d2d2d',
        'hand-active': '1px 1px 0 #2d2d2d',
      },
      borderRadius: {
        'wobbly': '255px 15px 225px 15px / 15px 225px 15px 255px',
        'wobbly-md': '25px 8px 20px 10px / 10px 22px 8px 25px',
      }
    },
  },
  plugins: [],
}
