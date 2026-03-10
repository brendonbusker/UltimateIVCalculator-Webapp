import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isStaticExport = process.env.NEXT_PUBLIC_DATA_MODE === 'static';
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const normalizedBasePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/, '');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://raw.githubusercontent.com https://img.pokemondb.net https://archives.bulbagarden.net",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  !isDevelopment ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: isStaticExport ? 'export' : undefined,
  trailingSlash: isStaticExport,
  basePath: isStaticExport ? normalizedBasePath : undefined,
  assetPrefix: isStaticExport && normalizedBasePath ? normalizedBasePath : undefined,
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.pokemondb.net',
      },
      {
        protocol: 'https',
        hostname: 'archives.bulbagarden.net',
      },
    ],
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: '/:path*',
              headers: securityHeaders,
            },
          ];
        },
      }),
};

export default nextConfig;