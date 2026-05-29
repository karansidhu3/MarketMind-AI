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
        // Warm neutral scale — resolves to warm values in both light and dark mode
        neutral: {
          50:  'rgb(var(--color-neutral-50)  / <alpha-value>)',
          100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
          200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
          300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
          400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
          700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
          800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
          950: 'rgb(var(--color-neutral-950) / <alpha-value>)',
        },
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
