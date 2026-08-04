import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        beerfest: {
          yellow: "#F5A623",
          amber: "#D48806",
          red: "#E8474B",
          navy: "#1A365D",
          cream: "#FFFAF0",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
