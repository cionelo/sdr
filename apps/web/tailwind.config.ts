import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Teko', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        pace: {
          bg: '#FFFBEB',
          card: '#FFFFFF',
          'card-inner': '#FEF9E7',
          input: '#FFFFFF',
          border: '#1C1917',
          'border-thin': '#D6D3D1',
          'border-accent': '#1E3A8A',
          text: '#1C1917',
          'text-secondary': '#57534E',
          'text-muted': '#A8A29E',
          accent: '#1E3A8A',
          'accent-light': '#EFF6FF',
          'accent-hover': '#1E40AF',
          'control-bg': '#F5F5F4',
          'control-active': '#1C1917',
          'control-active-text': '#FFFBEB',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
