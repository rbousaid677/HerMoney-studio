import { CATEGORIES } from '../constants/categories';
import { Article } from '../types';
import { stripHtmlToText } from './htmlUtils';

const SITE_NAME = 'HerMoney Studio';

export function generateSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
  return cleaned || 'untitled-article';
}

export function autoGenerateSeoTitle(title: string): string {
  const cleanTitle = title.trim();
  if (!cleanTitle) return `${SITE_NAME} — Modern Business & Wealth Editorial Magazine`;
  const suffix = ` | ${SITE_NAME}`;
  if (cleanTitle.length + suffix.length <= 65) {
    return `${cleanTitle}${suffix}`;
  }
  return cleanTitle.slice(0, 160);
}

export function autoGenerateExcerpt(htmlContent: string, maxLength = 220): string {
  const plain = stripHtmlToText(htmlContent);
  if (!plain) return '';
  if (plain.length <= maxLength) return plain;
  const truncated = plain.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
}

export function autoGenerateMetaDescription(excerpt: string, htmlContent: string): string {
  const source = excerpt.trim() || stripHtmlToText(htmlContent);
  if (!source) {
    return 'Read practical editorial guidance on HerMoney Studio covering online income, remote work, freelancing, small business, and passive wealth.';
  }
  if (source.length <= 158) return source;
  const truncated = source.slice(0, 155);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 50 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
}

export function getCanonicalBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://trusty-aleph-640px.web.app';
}

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  canonicalOverride?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noIndex?: boolean;
  schemaJson?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | undefined): void {
  if (typeof document === 'undefined') return;
  const existing = document.head.querySelector('script[data-hermoney-schema="true"]');
  if (!data) {
    if (existing) existing.remove();
    return;
  }
  const script = existing || document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-hermoney-schema', 'true');
  script.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function applySeoMetadata(config: SeoConfig): void {
  if (typeof document === 'undefined') return;

  const baseUrl = getCanonicalBaseUrl();
  const canonicalUrl =
    config.canonicalOverride?.trim() ||
    `${baseUrl}${config.canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')}`;

  const imageUrl =
    config.ogImage && config.ogImage.startsWith('/')
      ? `${baseUrl}${config.ogImage}`
      : config.ogImage || `${baseUrl}/src/assets/images/hero_editorial_studio_1795205654263.jpg`;

  document.title = config.title;
  upsertMetaTag('name', 'description', config.description);
  upsertMetaTag('name', 'robots', config.noIndex ? 'noindex, nofollow' : 'index, follow');

  upsertCanonicalLink(canonicalUrl);

  upsertMetaTag('property', 'og:site_name', SITE_NAME);
  upsertMetaTag('property', 'og:type', config.ogType || 'website');
  upsertMetaTag('property', 'og:title', config.title);
  upsertMetaTag('property', 'og:description', config.description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', imageUrl);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', config.title);
  upsertMetaTag('name', 'twitter:description', config.description);
  upsertMetaTag('name', 'twitter:image', imageUrl);

  upsertJsonLd(config.schemaJson);
}

export function buildArticleSchema(article: Article, url: string): Record<string, unknown> {
  const baseUrl = getCanonicalBaseUrl();
  const imageUrl = article.coverImage.startsWith('/')
    ? `${baseUrl}${article.coverImage}`
    : article.coverImage || `${baseUrl}/src/assets/images/hero_editorial_studio_1795205654263.jpg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.seoTitle || article.title,
    description: article.metaDescription || article.excerpt,
    image: [imageUrl],
    datePublished: article.publicationDate,
    dateModified: article.publicationDate,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: baseUrl,
    },
    articleSection: article.category,
    keywords: article.tags.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapXml(publishedArticles: Article[], baseUrl = getCanonicalBaseUrl()): string {
  const staticRoutes = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    ...CATEGORIES.map((c) => ({ path: `/category/${c.slug}`, changefreq: 'weekly', priority: '0.8' })),
    { path: '/about', changefreq: 'monthly', priority: '0.6' },
    { path: '/contact', changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy-policy', changefreq: 'yearly', priority: '0.4' },
    { path: '/terms-and-conditions', changefreq: 'yearly', priority: '0.4' },
    { path: '/disclaimer', changefreq: 'yearly', priority: '0.4' },
    { path: '/affiliate-disclosure', changefreq: 'yearly', priority: '0.4' },
  ];

  const staticEntries = staticRoutes
    .map(
      (route) => `  <url>
    <loc>${escapeXml(`${baseUrl}${route.path}`)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join('\n');

  const articleEntries = publishedArticles
    .map(
      (article) => `  <url>
    <loc>${escapeXml(`${baseUrl}/article/${article.slug}`)}</loc>
    <lastmod>${escapeXml(article.publicationDate || new Date().toISOString().slice(0, 10))}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${articleEntries ? articleEntries + '\n' : ''}</urlset>`;
}
