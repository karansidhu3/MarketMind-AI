/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        // All colors use RGB triplets so Tailwind opacity modifiers work (bg-green/10, etc.)
        background:       'rgb(var(--background) / <alpha-value>)',
        surface:          'rgb(var(--surface) / <alpha-value>)',
        elevated:         'rgb(var(--elevated) / <alpha-value>)',
        border:           'rgb(var(--border) / <alpha-value>)',
        'border-subtle':  'rgb(var(--border-subtle) / <alpha-value>)',
        'text-primary':   'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary':  'rgb(var(--text-tertiary) / <alpha-value>)',
        accent:           'rgb(var(--accent) / <alpha-value>)',
        green:            'rgb(var(--green) / <alpha-value>)',
        red:              'rgb(var(--red) / <alpha-value>)',
        amber:            'rgb(var(--amber) / <alpha-value>)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease forwards',
        'slide-up': 'slideUp 0.3s ease forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSubtle: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
}
