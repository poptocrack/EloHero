/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#764ba2',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          dark: '#44A08D',
        },
        accent: {
          DEFAULT: '#FF6B9D',
          dark: '#C44569',
        },
      },
    },
  },
  plugins: [],
};

