import type { Preview } from '@storybook/react-vite'

import '../src/index.css'
import '../src/styles/global.css'
import '../src/styles/CreateScreen.css'
import '../src/styles/MobileSurfacePreview.css'
import '../src/styles/ServiceFoundation.css'
import '../src/styles/DecisionPlanner.css'
import '../src/styles/material-tokens.css'
import '../src/styles/soft-material.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',

    options: {
      storySort: {
        order: [
          '00 System',
          '01 Foundations',
          '02 Primitives',
          '03 Product Patterns',
          '04 Decision System',
          '05 Workflows',
        ],
      },
    },

    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo',
    },

    docs: {
      canvas: { sourceState: 'shown' },
    },
    backgrounds: {
      options: {
        canvas: { name: 'MeetCue canvas', value: '#f6f7f9' },
        surface: { name: 'Surface', value: '#ffffff' },
      },
    },
    viewport: {
      options: {
        mobileSmall: {
          name: 'Mobile · 320',
          styles: { width: '320px', height: '720px' },
        },
        mobileProduct: {
          name: 'Mobile · 390',
          styles: { width: '390px', height: '844px' },
        },
        tablet: {
          name: 'Tablet · 760',
          styles: { width: '760px', height: '900px' },
        },
        desktop: {
          name: 'Desktop · 1440',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'canvas',
    },
  },

  tags: ['autodocs'],
}

export default preview
