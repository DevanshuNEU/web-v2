import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // PostHog brand colors - clean and professional
      colors: {
        // Primary PostHog brand palette
        brand: {
          orange: '#f54e00',
          yellow: '#f9e71e', 
          pink: '#ff6b93',
          blue: '#345eeb',
          purple: '#9333ea',
          green: '#00b14f'
        },
        
        // PostHog background system (light mode primary)
        background: {
          primary: '#faf9f6',    // PostHog's off-white
          secondary: '#ffffff',   // Pure white for windows
          accent: '#f5f5f4'      // Subtle gray for cards
        },
        
        // Text colors for excellent readability
        content: {
          primary: '#1f1f1f',    // Near black for main text
          secondary: '#6b7280',  // Gray for supporting text
          muted: '#9ca3af'       // Light gray for hints
        },
        
        // Window system colors
        window: {
          border: '#e5e7eb',     // Clean borders
          shadow: 'rgba(0, 0, 0, 0.05)', // Subtle shadows
          titlebar: '#f8fafc'    // Clean titlebar background
        }
      },
      
      // Clean, readable typography like PostHog
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace']
      },
      
      // Smooth, professional animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'window-appear': 'windowAppear 0.25s ease-out'
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        windowAppear: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      
      // Clean spacing system
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      }
    },
  },
  plugins: [],
  // Light mode as default
  darkMode: 'class',
};

export default config;
