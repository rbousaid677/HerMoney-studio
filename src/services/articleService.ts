import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CATEGORY_NAMES } from '../constants/categories';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Article, ArticleInput, ArticleStatus, CategoryName } from '../types';
import { sanitizeArticleHtml } from '../utils/htmlUtils';
import {
  autoGenerateExcerpt,
  autoGenerateMetaDescription,
  autoGenerateSeoTitle,
  generateSlug,
} from '../utils/seo';

const ARTICLES_COLLECTION = 'articles';

function normalizeArticle(id: string, data: Record<string, unknown>): Article {
  const category = CATEGORY_NAMES.includes(data.category as CategoryName)
    ? (data.category as CategoryName)
    : 'Make Money Online';

  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    slug: typeof data.slug === 'string' ? data.slug : id,
    category,
    coverImage: typeof data.coverImage === 'string' ? data.coverImage : '',
    content: typeof data.content === 'string' ? data.content : '',
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
    metaDescription: typeof data.metaDescription === 'string' ? data.metaDescription : '',
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : '',
    canonicalUrl: typeof data.canonicalUrl === 'string' ? data.canonicalUrl : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
    author: typeof data.author === 'string' ? data.author : 'HerMoney Editorial',
    publicationDate:
      typeof data.publicationDate === 'string'
        ? data.publicationDate
        : new Date().toISOString().slice(0, 10),
    status: data.status === 'published' ? 'published' : 'draft',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const dateCompare = (b.publicationDate || '').localeCompare(a.publicationDate || '');
    if (dateCompare !== 0) return dateCompare;
    return b.title.localeCompare(a.title);
  });
}

export async function getPublishedArticles(): Promise<Article[]> {
  try {
    const q = query(
      collection(db, ARTICLES_COLLECTION),
      where('status', '==', 'published')
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => normalizeArticle(d.id, d.data()));
    return sortByDateDesc(items);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ARTICLES_COLLECTION);
  }
}

export async function getPublishedArticlesByCategory(category: CategoryName): Promise<Article[]> {
  try {
    const q = query(
      collection(db, ARTICLES_COLLECTION),
      where('status', '==', 'published'),
      where('category', '==', category)
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => normalizeArticle(d.id, d.data()));
    return sortByDateDesc(items);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${ARTICLES_COLLECTION}?category=${category}`);
  }
}

export async function getPublishedArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const q = query(
      collection(db, ARTICLES_COLLECTION),
      where('status', '==', 'published'),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const first = snapshot.docs[0];
    return normalizeArticle(first.id, first.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${ARTICLES_COLLECTION}?slug=${slug}`);
  }
}

export async function getAllArticlesForAdmin(): Promise<Article[]> {
  try {
    const snapshot = await getDocs(collection(db, ARTICLES_COLLECTION));
    const items = snapshot.docs.map((d) => normalizeArticle(d.id, d.data()));
    return sortByDateDesc(items);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ARTICLES_COLLECTION);
  }
}

function buildValidatedPayload(input: ArticleInput) {
  const cleanTitle = input.title.trim().slice(0, 200);
  const cleanSlug = generateSlug(input.slug || cleanTitle).slice(0, 180);
  const cleanContent = sanitizeArticleHtml(input.content).slice(0, 500000);
  const cleanExcerpt = (input.excerpt.trim() || autoGenerateExcerpt(cleanContent)).slice(0, 500);
  const cleanMeta = (
    input.metaDescription.trim() || autoGenerateMetaDescription(cleanExcerpt, cleanContent)
  ).slice(0, 320);
  const cleanSeoTitle = (input.seoTitle.trim() || autoGenerateSeoTitle(cleanTitle)).slice(0, 160);
  const cleanCanonical = input.canonicalUrl.trim().slice(0, 500);
  const cleanTags = input.tags
    .map((t) => t.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 15);
  const cleanAuthor = (input.author.trim() || 'HerMoney Editorial').slice(0, 120);
  const cleanDate = (input.publicationDate.trim() || new Date().toISOString().slice(0, 10)).slice(0, 40);
  const cleanCategory: CategoryName = CATEGORY_NAMES.includes(input.category)
    ? input.category
    : 'Make Money Online';
  const cleanStatus: ArticleStatus = input.status === 'published' ? 'published' : 'draft';
  const cleanCover = input.coverImage.trim().slice(0, 300000);

  return {
    title: cleanTitle,
    slug: cleanSlug,
    category: cleanCategory,
    coverImage: cleanCover,
    content: cleanContent,
    excerpt: cleanExcerpt,
    metaDescription: cleanMeta,
    seoTitle: cleanSeoTitle,
    canonicalUrl: cleanCanonical,
    tags: cleanTags,
    author: cleanAuthor,
    publicationDate: cleanDate,
    status: cleanStatus,
  };
}

function generateSafeDocumentId(slug: string): string {
  const prefix = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'article';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

export async function saveArticle(
  input: ArticleInput,
  authorUid: string,
  existingArticleId?: string
): Promise<string> {
  const payload = buildValidatedPayload(input);
  if (!payload.title) {
    throw new Error('Article title is required.');
  }

  if (existingArticleId) {
    const path = `${ARTICLES_COLLECTION}/${existingArticleId}`;
    try {
      await updateDoc(doc(db, ARTICLES_COLLECTION, existingArticleId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      return existingArticleId;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    const newId = generateSafeDocumentId(payload.slug);
    const path = `${ARTICLES_COLLECTION}/${newId}`;
    try {
      await setDoc(doc(db, ARTICLES_COLLECTION, newId), {
        ...payload,
        authorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function updateArticleStatus(articleId: string, status: ArticleStatus): Promise<void> {
  const path = `${ARTICLES_COLLECTION}/${articleId}`;
  try {
    await updateDoc(doc(db, ARTICLES_COLLECTION, articleId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteArticle(articleId: string): Promise<void> {
  const path = `${ARTICLES_COLLECTION}/${articleId}`;
  try {
    await deleteDoc(doc(db, ARTICLES_COLLECTION, articleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
