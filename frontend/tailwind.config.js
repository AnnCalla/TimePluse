/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tp: {
          green: "#84cc16",      
          greenLight: "#bef264", 
          bg: "#f7fee7",         
          glass: "rgba(255, 255, 255, 0.7)",
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      // 👇👇👇 关键点：必须有这段定义，shadow-glass 才会存在！ 👇👇👇
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(132, 204, 22, 0.15)',
      }
    },
  },
  plugins: [],
}