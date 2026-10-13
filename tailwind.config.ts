import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed', // primary electric violet
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        peach: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#ffe0c2',
          300: '#ffd8b8',
          400: '#ffcba4', // accent peach
          500: '#ffb880',
        },
        surface: {
          DEFAULT: '#0F0F1A',
          raised: '#1A1A2E',
          overlay: '#252540',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;