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
          50: '#fef3ed',
          100: '#fde4d4',
          200: '#fbc5a8',
          300: '#f8a071',
          400: '#f47238',
          500: '#C45D2C', // primary accent
          600: '#a34a22',
          700: '#87391d',
          800: '#6e2f1e',
          900: '#5b281c',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          raised: '#1a1a1a',
          overlay: '#252525',
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
