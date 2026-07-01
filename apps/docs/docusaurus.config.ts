import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import rootPackageJson from '../../package.json';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const appVersion = rootPackageJson.version;

const config: Config = {
  title: 'CIG Documentation',
  tagline: 'Compute Intelligence Graph',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://cig.lat',
  // Served at cig.lat/documentation via the landing GitHub Pages deployment
  baseUrl: '/documentation/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'edwardcalderon', // Usually your GitHub org/user name.
  projectName: 'ComputeIntelligenceGraph', // Usually your repo name.

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'cig-version',
        content: appVersion,
      },
    },
    {
      tagName: 'script',
      attributes: {
        type: 'text/javascript',
      },
      innerHTML: `window.__CIG_VERSION__ = ${JSON.stringify(appVersion)};`,
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/edit/main/apps/docs/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [],

  customFields: {
    appVersion,
  },

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CIG Documentation',
      logo: {
        alt: 'CIG Logo',
        src: 'img/cig-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    // Footer is now handled by custom theme component at src/theme/Footer/index.tsx
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'csharp'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
