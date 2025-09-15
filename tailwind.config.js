/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        foreground: '#d9d9d9',
        primary: {
          DEFAULT: '#a0a0a0',
          foreground: '#1a1a1a',
        },
        secondary: {
          DEFAULT: '#303030',
          foreground: '#d9d9d9',
        },
        accent: {
          DEFAULT: '#404040',
          foreground: '#d9d9d9',
        },
        card: {
          DEFAULT: '#202020',
          foreground: '#d9d9d9',
        },
        popover: {
          DEFAULT: '#202020',
          foreground: '#d9d9d9',
        },
        muted: {
          DEFAULT: '#2a2a2a',
          foreground: '#808080',
        },
        border: '#353535',
        input: '#303030',
        ring: '#a0a0a0',
      },
    },
  },
  plugins: [],
}
