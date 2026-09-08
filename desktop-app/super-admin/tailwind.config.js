/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      colors: {
        /*
         * BKWB unified brand palette (teal-green, anchored on the meter-reader
         * app color). `primary` is the canonical name; `blue`/`sky`/`indigo`/
         * `cyan` are kept as legacy aliases that resolve to the same scale so
         * no old blue usage can leak through. `gray` is aliased to `slate` so
         * neutral surfaces stay in one family.
         */
        primary: {
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
        brand: {
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
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        '2xs': '0 1px 1px 0 rgb(15 23 42 / 0.04)',
      },
    },
  },
  plugins: [],
}
