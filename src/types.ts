export const CATEGORY_NAMES = [
  'Make Money Online',
  'Work From Home',
  'Freelancing',
  'Small Business Ideas',
  'Passive Income',
  'Blogging & Pinterest',
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];

export type ArticleStatus = 'draft' | 'published';

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: CategoryName;
  coverImage: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  seoTitle: string;
  canonicalUrl: string;
  tags: string[];
  author: string;
  publicationDate: string;
  status: ArticleStatus;
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ArticleInput {
  title: string;
  slug: string;
  category: CategoryName;
  coverImage: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  seoTitle: string;
  canonicalUrl: string;
  tags: string[];
  author: string;
  publicationDate: string;
  status: ArticleStatus;
}

export type AdPlacementKey =
  | 'headerBanner'
  | 'homeMidSection'
  | 'categoryTop'
  | 'inArticle'
  | 'footerBanner';

export interface AdPlacementConfig {
  enabled: boolean;
  slotId: string;
  format: 'auto' | 'horizontal' | 'rectangle';
}

export interface AdSenseSettings {
  adsenseEnabled: boolean;
  publisherId: string;
  placements: Record<AdPlacementKey, AdPlacementConfig>;
  updatedByUid: string;
  updatedAt?: unknown;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  consentAccepted: boolean;
  createdAt?: unknown;
}

export interface BackupRecord {
  id: string;
  label: string;
  articleCount: number;
  publishedCount: number;
  draftCount: number;
  sizeBytes: number;
  createdByUid: string;
  createdAt?: unknown;
}

export interface ConsentPreferences {
  responded: boolean;
  essential: true;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export type NotificationAudience = 'public' | 'admin';
export type NotificationType = 'article_published' | 'editorial' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  link: string;
  read: boolean;
  createdByUid: string;
  createdAt?: unknown;
}

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

