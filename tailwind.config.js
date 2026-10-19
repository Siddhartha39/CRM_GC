/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#E0E5EC',
        foreground: '#3D4852',
        muted: '#6B7280',
        accent: {
          DEFAULT: '#6C63FF',
          light: '#8B84FF',
          secondary: '#38B2AC',
        },
        'accent-secondary': '#38B2AC',
        border: 'transparent',
        'paper-white': '#E0E5EC',
        'sticky-yellow': '#E0E5EC',
        success: '#38B2AC',
        warning: '#D69E2E',
        danger: '#E53E3E',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        // Core Neumorphic (Soft UI) Dual Shadows
        'neu-flat': '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)',
        'neu-flat-hover': '12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)',
        'neu-flat-sm': '5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5)',
        'neu-pressed': 'inset 6px 6px 10px rgb(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.5)',
        'neu-pressed-deep': 'inset 10px 10px 20px rgb(163,177,198,0.7), inset -10px -10px 20px rgba(255,255,255,0.6)',
        'neu-pressed-sm': 'inset 3px 3px 6px rgb(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.5)',
        'neu-accent': '6px 6px 14px rgba(108, 99, 255, 0.4), -6px -6px 14px rgba(255, 255, 255, 0.6)',

        // Seamless fallbacks for legacy class compatibility
        'hand': '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)',
        'hand-lg': '12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255,0.6)',
        'hand-sm': '5px 5px 10px rgb(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.5)',
        'hand-active': 'inset 3px 3px 6px rgb(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.5)',
      },
      borderRadius: {
        'neu-card': '32px',
        'neu-btn': '16px',
        'neu-inner': '12px',
        'wobbly': '32px',
        'wobbly-md': '16px',
      },
    },
  },
  plugins: [],
}
