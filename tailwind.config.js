/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 신성대학교 브랜드 컬러. 학교 공식 CI 가이드에서 확정된 HEX 코드를
        // 별도로 전달받지 못해, 학교 공식 홈페이지(shinsung.ac.kr)의
        // theme-color 메타 값(#00a69c, 청록색 계열)을 기준으로 임시 팔레트를 만들었다.
        // 정확한 공식 컬러 코드를 확인하시면 이 팔레트만 교체하면 전체 UI에 반영된다.
        brand: {
          50: "#e6faf8",
          100: "#ccf5f1",
          200: "#99ebe3",
          300: "#66e0d4",
          400: "#33d6c6",
          500: "#00a69c",
          600: "#00857d",
          700: "#00645e",
          800: "#00433f",
          900: "#00211f",
        },
      },
    },
  },
  plugins: [],
};
