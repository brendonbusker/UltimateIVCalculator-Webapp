import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site-config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url }];
}
