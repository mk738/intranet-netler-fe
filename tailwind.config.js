/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        bg:         '#1a1525',
        'bg-card':  '#221c30',
        'bg-hover': '#2a2240',
        'bg-input': '#150f20',
        sidebar:    '#201a2e',

        // Purple palette
        purple: {
          DEFAULT: '#7c3aed',
          light:   '#9d5ff5',
          dark:    '#4c1d95',
          bg:      '#2e1e4a',
          border:  'rgba(124,58,237,0.3)',
        },

        // Text
        'text-1': '#f0ecf8',
        'text-2': '#a89ec0',
        'text-3': '#6b617e',

        // Semantic
        success:        '#10b981',
        'success-bg':   '#0d2e22',
        warning:        '#f59e0b',
        'warning-bg':   '#2d1f06',
        danger:         '#f87171',
        'danger-bg':    '#2d1010',
        prospect:       '#9d5ff5',
        'prospect-bg':  '#2e1e4a',
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.07)',
        mild:   'rgba(255,255,255,0.12)',
        purple: 'rgba(124,58,237,0.3)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.4)',
        modal:  '0 8px 32px rgba(0,0,0,0.6)',
        purple: '0 0 0 2px rgba(124,58,237,0.4)',
      },
    },
  },
  plugins: [],
}
