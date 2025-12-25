/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./features/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
                mono: ['Courier Prime', 'monospace'],
                script: ['Architects Daughter', 'cursive'],
                // Editorial Pack
                editorial: ['Playfair Display', 'serif'],
                'body-serif': ['Lora', 'serif'],
                'modern-clean': ['Montserrat', 'sans-serif'],
                'slab': ['Roboto Slab', 'serif'],
            },
            colors: {
                cosmic: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0f172a',
                    950: '#082f49',
                },
                accent: {
                    500: '#8b5cf6', // Violet
                    600: '#7c3aed',
                },
                glass: {
                    white: 'rgba(255, 255, 255, 0.1)',
                    black: 'rgba(0, 0, 0, 0.3)',
                    border: 'rgba(255, 255, 255, 0.15)',
                    highlight: 'rgba(255, 255, 255, 0.05)',
                }
            },
            backgroundImage: {
                'cosmic-gradient': 'linear-gradient(to bottom right, #0f172a, #1e1b4b)',
                'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            },
            boxShadow: {
                'neon': '0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
};
