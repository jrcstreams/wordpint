/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f7f3ea',
          dark: '#ebe4d3',
          shadow: '#d7ceb5',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          soft: '#3a3328',
          mute: '#6b6356',
        },
        amber: {
          tile: '#e8a838',
          glow: '#fad97c',
          deep: '#5a3818',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        receipt: ['"Special Elite"', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
