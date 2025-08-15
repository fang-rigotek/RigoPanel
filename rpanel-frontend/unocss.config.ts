import { defineConfig, presetUno, presetAttributify } from 'unocss';
import presetIcons from '@unocss/preset-icons';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        mdi:    () => import('@iconify-json/mdi/icons.json').then(i => i.default),
        tabler: () => import('@iconify-json/tabler/icons.json').then(i => i.default),
      },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  theme: {
    // 只有两个断点：sm=640, md=1024
    breakpoints: {
      sm: '640px',   // 平板与以上
      md: '1024px',  // PC 与以上
    },
    colors: {
      brand: 'var(--color-brand)',
      bg:    'var(--color-bg)',
      card:  'var(--color-card)',
      line:  'var(--color-line)',
      text:  'var(--color-text)',
      sub:   'var(--color-sub)',
    },
    borderRadius: {
      card: 'var(--radius-card)',
    },
  },
});
