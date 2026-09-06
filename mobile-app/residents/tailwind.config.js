/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        /*
         * BKWB unified brand palette (teal-green, anchored on the meter-reader
         * app color). DEFAULT is used for headers, CTAs and active states;
         * `dark`/`light` are press/tint variants.
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
