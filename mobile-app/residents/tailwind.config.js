/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1E5B8C',
          dark: '#174A73',
          light: '#2B6FA3',
        },
      },
    },
  },
  plugins: [],
};
