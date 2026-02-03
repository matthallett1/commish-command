/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Top Pot brand colors
        primary: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#f9d7ac',
          300: '#f5ba77',
          400: '#f09440',
          500: '#ec7619',
          600: '#dd5c0f',
          700: '#b7440f',
          800: '#923714',
          900: '#762f14',
          950: '#401508',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
