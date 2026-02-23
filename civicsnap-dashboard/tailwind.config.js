/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter-Regular', 'sans-serif'],
        'inter-medium': ['Inter-Medium', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'sans-serif'],
        'inter-extrabold': ['Inter-ExtraBold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}