import DOMPurify from 'dompurify';
import { TocItem } from '../types';

const SAFE_RASTER_DATA_IMAGE_REGEX = /^data:image\/(?:webp|jpeg|png|gif);base64,/i;

export function sanitizeArticleHtml(dirtyHtml: string): string {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'IMG' && node.hasAttribute('href')) {
      const href = node.getAttribute('href') || '';
      if (/^data:/i.test(href.trim())) {
        node.removeAttribute('href');
      }
    }
    if (node.tagName === 'IMG' && node.hasAttribute('src')) {
      const src = (node.getAttribute('src') || '').trim();
      if (/^data:/i.test(src) && !SAFE_RASTER_DATA_IMAGE_REGEX.test(src)) {
        node.removeAttribute('src');
      }
    }
  });

  try {
    const clean = DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        'h2',
        'h3',
        'h4',
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
        'img',
        'div',
        'span',
        'hr',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'id', 'style'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP:
        /^(?:(?:https?|mailto):|\/src\/assets\/|data:image\/(?:webp|jpeg|png|gif);base64,)/i,
    });

    return clean;
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
}

export function stripHtmlToText(html: string): string {
  if (!html) return '';
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function extractTableOfContents(rawHtml: string): {
  processedHtml: string;
  tocItems: TocItem[];
} {
  const sanitized = sanitizeArticleHtml(rawHtml);
  if (typeof DOMParser === 'undefined' || !sanitized.trim()) {
    return { processedHtml: sanitized, tocItems: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  const headings = doc.querySelectorAll('h2, h3');
  const tocItems: TocItem[] = [];
  const usedIds = new Map<string, number>();

  headings.forEach((heading, index) => {
    const text = (heading.textContent || '').trim();
    if (!text) return;

    const baseId = slugifyHeading(text) || `section-${index + 1}`;
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const uniqueId = count === 0 ? baseId : `${baseId}-${count + 1}`;

    heading.setAttribute('id', uniqueId);
    tocItems.push({
      id: uniqueId,
      text,
      level: heading.tagName === 'H3' ? 3 : 2,
    });
  });

  // Ensure external links open safely with rel="noopener noreferrer"
  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Optimize inline article images
  doc.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('referrerpolicy', 'no-referrer');
  });

  return {
    processedHtml: doc.body.innerHTML,
    tocItems,
  };
}

export function calculateReadingTime(html: string): { words: number; minutes: number } {
  const text = stripHtmlToText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return { words, minutes };
}
