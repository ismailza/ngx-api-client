import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const organizationName = 'ismailza';
const projectName = 'ngx-api-client';
const packageName = '@ismailza/ngx-api-client';
const repoUrl = `https://github.com/${organizationName}/${projectName}`;

const config: Config = {
  title: 'ngx-api-client',
  tagline: 'A typed, interceptor-driven HTTP layer for Angular',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: `https://${organizationName}.github.io`,
  baseUrl: `/${projectName}/`,

  organizationName,
  projectName,
  trailingSlash: false,

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Required by `markdown.mermaid`: renders ```mermaid fences as diagrams.
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `${repoUrl}/tree/main/website/`,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
    metadata: [
      {
        name: 'keywords',
        content:
          'angular, httpclient, http interceptor, rfc 9457, problem details, retry, backoff, api client',
      },
    ],
    navbar: {
      title: 'ngx-api-client',
      logo: {
        alt: 'ngx-api-client logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api/provide-api',
          label: 'API reference',
          position: 'left',
        },
        {
          href: `https://www.npmjs.com/package/${packageName}`,
          label: 'npm',
          position: 'right',
        },
        {
          href: repoUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Installation', to: '/docs/getting-started/installation' },
            { label: 'Quick start', to: '/docs/getting-started/quick-start' },
            { label: 'API reference', to: '/docs/api/provide-api' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: repoUrl },
            { label: 'npm', href: `https://www.npmjs.com/package/${packageName}` },
            { label: 'Changelog', href: `${repoUrl}/releases` },
            { label: 'Issues', href: `${repoUrl}/issues` },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Contributing', href: `${repoUrl}/blob/main/CONTRIBUTING.md` },
            { label: 'Code of conduct', href: `${repoUrl}/blob/main/CODE_OF_CONDUCT.md` },
            { label: 'Security policy', href: `${repoUrl}/blob/main/SECURITY.md` },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ismail ZAHIR. Released under the MIT License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'diff'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
