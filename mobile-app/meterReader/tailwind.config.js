/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        /*
         * BKWB unified brand palette (teal-green). `brand` fills the role of
         * the old meter-reader teal; `navy` tokens were blue-gray text/icon
         * tones and now map to a single neutral ink family so nothing reads
         * blue. Status tokens (pending/alert/success) stay semantic.
         */
        brand: {
          DEFAULT: '#186252',
          dark: '#114C41',
          light: '#1F7A66',
          soft: '#D8EFE8',
          50: '#EEF7F4',
          100: '#D8EFE8',
          200: '#B0E0D3',
          300: '#81CBB8',
          400: '#52AF99',
          500: '#30947E',
          600: '#1F7A66',
          700: '#186252',
          800: '#114C41',
          900: '#0C3830',
          950: '#06241F',
        },
        // Neutral ink scale (replaces the old blue-gray "navy" family).
        navy: {
          DEFAULT: '#1E293B',
          muted: '#64748B',
          soft: '#94A3B8',
        },
        // Soft brand-tinted surfaces (sync button, tints).
        sync: {
          DEFAULT: '#D8EFE8',
          text: '#186252',
        },
        pending: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        completed: {
          soft: '#D8EFE8',
        },
        alert: {
          DEFAULT: '#DC2626',
          soft: '#FEF2F2',
          muted: '#991B1B',
        },
        nav: {
          bar: '#F1F5F9',
          active: '#186252',
          inactive: '#94A3B8',
        },
        surface: '#F3F6F5',
        // Legacy aliases so no stock blue-family class can leak through.
        blue: {
          50: '#EEF7F4',
          100: '#D8EFE8',
          200: '#B0E0D3',
          300: '#81CBB8',
          400: '#52AF99',
          500: '#30947E',
          600: '#1F7A66',
          700: '#186252',
          800: '#114C41',
          900: '#0C3830',
          950: '#06241F',
        },
        sky: {
          50: '#EEF7F4',
          100: '#D8EFE8',
          200: '#B0E0D3',
          300: '#81CBB8',
          400: '#52AF99',
          500: '#30947E',
          600: '#1F7A66',
          700: '#186252',
          800: '#114C41',
          900: '#0C3830',
          950: '#06241F',
        },
        indigo: {
          50: '#EEF7F4',
          100: '#D8EFE8',
          200: '#B0E0D3',
          300: '#81CBB8',
          400: '#52AF99',
          500: '#30947E',
          600: '#1F7A66',
          700: '#186252',
          800: '#114C41',
          900: '#0C3830',
          950: '#06241F',
        },
        cyan: {
          50: '#EEF7F4',
          100: '#D8EFE8',
          200: '#B0E0D3',
          300: '#81CBB8',
          400: '#52AF99',
          500: '#30947E',
          600: '#1F7A66',
          700: '#186252',
          800: '#114C41',
          900: '#0C3830',
          950: '#06241F',
        },
      },
    },
  },
  plugins: [],
};
