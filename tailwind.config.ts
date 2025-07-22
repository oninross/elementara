import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "damage-float": {
          "0%": {
            transform: "translateY(0) scale(1)",
            opacity: "1",
          },
          "50%": {
            transform: "translateY(-20px) scale(1.2)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(-40px) scale(0.8)",
            opacity: "0",
          },
        },
        "coin-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(1800deg)" },
        },
        "coin-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "card-flip-and-scale": {
          "0%": {
            transform: "rotateY(90deg) scale(0.5)",
            opacity: "0",
          },
          "50%": {
            transform: "rotateY(45deg) scale(0.75)",
            opacity: "0.5",
          },
          "100%": {
            transform: "rotateY(0deg) scale(1)",
            opacity: "1",
          },
        },
        criticalMiss: {
          "0%": {
            transform: "scale(0.5)",
            opacity: "0",
          },
          "20%": {
            transform: "scale(1.2)",
            opacity: "1",
          },
          "80%": {
            transform: "scale(1.5)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(1.8)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "damage-float": "damage-float 2s ease-out forwards",
        "coin-flip": "coin-flip 2s ease-in-out",
        "coin-bounce": "coin-bounce 0.5s ease-in-out infinite",
        "card-flip-and-scale": "card-flip-and-scale 0.6s ease-out forwards",
        "critical-miss": "criticalMiss 1s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
