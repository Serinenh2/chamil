/**
 * Thème Tailwind CHAMIL — reprend exactement les jetons du design system
 * (hérités de MRAFIQ). Les couleurs pointent vers des variables CSS pour que
 * la bascule clair / sombre se fasse sans recompilation.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#081C33', 800: '#0B2545' },
        primary: {
          700: '#14498F', 600: '#1B5CB4', 500: '#2E74D6',
          100: '#DCE9FA', 50: '#EFF5FD',
        },
        brass: { 500: '#B08A3C', 300: '#D9BC7F' },
        // Surfaces pilotées par les variables CSS (voir styles/tokens.css)
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        sunken: 'var(--bg-sunken)',
        sidebar: 'var(--bg-sidebar)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        content: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        subtle: 'var(--text-muted)',
        // États commerciaux
        ok: { DEFAULT: 'var(--status-ok)', bg: 'var(--status-ok-bg)' },
        wait: { DEFAULT: 'var(--status-wait)', bg: 'var(--status-wait-bg)' },
        late: { DEFAULT: 'var(--status-late)', bg: 'var(--status-late-bg)' },
        draft: { DEFAULT: 'var(--status-draft)', bg: 'var(--status-draft-bg)' },
        proc: { DEFAULT: 'var(--status-proc)', bg: 'var(--status-proc-bg)' },
        // Urgences
        critical: '#A11B1B', high: '#C2510A', medium: '#B08A00', low: '#4A7DBE',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['2.5rem', { lineHeight: '1.15', fontWeight: '700' }],
        page: ['1.5rem', { lineHeight: '1.25', fontWeight: '700' }],
        card: ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        base: ['0.9375rem', { lineHeight: '1.6' }],
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', pill: '999px' },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
      transitionTimingFunction: { chamil: 'cubic-bezier(.22,.8,.36,1)' },
    },
  },
  plugins: [],
}
