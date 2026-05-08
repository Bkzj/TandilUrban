import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        verde: '#1C5E3C',
        'verde-hover': '#236F47',
        'verde-light': '#E8F2EC',
        'verde-dark': '#12422A',
        naranja: '#957327',
        'naranja-hover': '#AA852E',
        'naranja-light': '#F6EEDB',
        'naranja-dark': '#6D531A',
        background: '#F5F6F4',
        surface: '#FFFFFF',
        'text-primary': '#1F2937',
        'text-secondary': '#6B7280',
        'border-light': '#E5E7EB',
      },
    },
  },
};

export default config;

