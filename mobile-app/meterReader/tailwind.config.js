/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0D4F5C',
          dark: '#0A3F4A',
          light: '#1A6A7A',
        },
        navy: {
          DEFAULT: '#1A3A5C',
          muted: '#5A6F82',
          soft: '#8FA3B5',
        },
        sync: {
          DEFAULT: '#B8D4E8',
          text: '#1A4A6A',
        },
        pending: {
          DEFAULT: '#C17A3A',
          soft: '#F5E0C8',
        },
        completed: {
          soft: '#D6EAF5',
        },
        nav: {
          bar: '#C5CDD6',
          active: '#1E3A5F',
          inactive: '#94A3B8',
        },
        surface: '#F4F7FA',
      },
    },
  },
  plugins: [],
};
