/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-dark': '#0b1220',
        'bg-darker': '#0a101c',
        card: '#0f1b2f',
        'card-2': '#11243d',
        muted: '#8fa4c0',
        accent: '#4fa3ff',
        'accent-strong': '#2f7bfd',
        'accent-green': '#1ec986',
        'accent-red': '#f66d73',
        'accent-yellow': '#f2c14f',
        'border-soft': 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
