import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(viteConfig, { configType }) {
    return {
      ...viteConfig,
      base: configType === 'PRODUCTION' ? './' : '/',
      // The app-only plugin copies the Vite entry into /toss after a production build.
      // Storybook has its own output and must not mutate the app's dist directory.
      plugins: viteConfig.plugins?.filter((plugin) => {
        if (!plugin || Array.isArray(plugin) || typeof plugin !== 'object') return true
        return !('name' in plugin) || plugin.name !== 'toss-demo-entry'
      }),
    }
  },
}

export default config
