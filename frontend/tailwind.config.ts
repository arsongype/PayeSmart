import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6F2',
          100: '#DFEEE6',
          200: '#C1DDCE',
          300: '#91C5AC',
          400: '#5CA78A',
          500: '#278B71',
          600: '#227A64',
          700: '#1D6855',
          800: '#195445',
          900: '#164638',
          950: '#0D2F26',
        },
        dark: {
          50: '#0B1120',
          100: '#111827',
          200: '#1F2937',
          300: '#374151',
          400: '#4B5563',
          500: '#6B7280',
          600: '#9CA3AF',
          700: '#D1D5DB',
          800: '#E5E7EB',
          900: '#F3F4F6',
          950: '#F9FAFB',
        },
        accent: {
          emerald: '#10B981',
          rose: '#F43F5E',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(22, 70, 56, 0.07), 0 1px 2px rgba(22, 70, 56, 0.04)',
        glow: '0 0 20px rgba(39, 139, 113, 0.16)',
        'glow-lg': '0 0 40px rgba(39, 139, 113, 0.24)',
        card: '0 4px 6px -1px rgba(22, 70, 56, 0.07), 0 2px 4px -2px rgba(22, 70, 56, 0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(39, 139, 113, 0.32)' },
          '100%': { boxShadow: '0 0 20px rgba(39, 139, 113, 0.52)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      gradientColorStops: {
        'gradient-start': 'rgba(39, 139, 113, 0.09)',
        'gradient-end': 'rgba(22, 70, 56, 0.03)',
      },
    },
  },
  plugins: [],
}
export default config