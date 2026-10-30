const locales = ['en', 'es', 'pt', 'fr'];
const privateRoots = [
  'api',
  'dashboard',
  'auth',
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'confirmation',
];

function sitemapOrigin(value) {
  if (value === undefined) return 'http://localhost:3000';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SITE_URL must be an absolute HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('SITE_URL must be an absolute HTTP(S) origin');
  }
  return url.origin;
}

function isPrivatePath(path) {
  let segments;
  try {
    segments = new URL(path, 'https://sitemap.invalid').pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment).toLowerCase());
  } catch {
    return true;
  }
  if (locales.includes(segments[0])) segments.shift();
  return privateRoots.includes(segments[0]);
}

const disallow = privateRoots.flatMap((root) => [
  `/${root}`,
  ...locales.map((locale) => `/${locale}/${root}`),
]);

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: sitemapOrigin(process.env.SITE_URL),
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/api/*', '/dashboard/*', '/auth/*'],
  transform: async (config, path) => {
    if (isPrivatePath(path)) return null;
    return {
      loc: path,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      changefreq: config.changefreq,
      priority: config.priority,
      alternateRefs: config.alternateRefs ?? [],
      trailingSlash: config.trailingSlash,
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
  },
};
