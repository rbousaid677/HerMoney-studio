import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdSenseSettings, Article, ArticleInput, BackupRecord } from '../types';
import { saveArticle } from './articleService';

const BACKUPS_COLLECTION = 'backups';
const LAST_BACKUP_KEY = 'hermoney_last_backup_at';

export interface FullBackupPayload {
  schemaVersion: 1;
  siteName: 'HerMoney Studio';
  exportedAt: string;
  articles: Array<Omit<Article, 'createdAt' | 'updatedAt'>>;
  adsenseSettings: Omit<AdSenseSettings, 'updatedAt'>;
}

export function buildBackupPayload(
  articles: Article[],
  adsenseSettings: AdSenseSettings
): FullBackupPayload {
  return {
    schemaVersion: 1,
    siteName: 'HerMoney Studio',
    exportedAt: new Date().toISOString(),
    articles: articles.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
    adsenseSettings: {
      adsenseEnabled: adsenseSettings.adsenseEnabled,
      publisherId: adsenseSettings.publisherId,
      placements: adsenseSettings.placements,
      updatedByUid: adsenseSettings.updatedByUid,
    },
  };
}

export function downloadBackupJson(payload: FullBackupPayload): number {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `hermoney-studio-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  return new Blob([json]).size;
}

export function getLastLocalBackupTimestamp(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export async function recordBackupSnapshot(
  label: string,
  articles: Article[],
  sizeBytes: number,
  adminUid: string
): Promise<string> {
  const id = `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `${BACKUPS_COLLECTION}/${id}`;
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.length - publishedCount;

  try {
    await setDoc(doc(db, BACKUPS_COLLECTION, id), {
      label: label.trim().slice(0, 160) || `Snapshot ${new Date().toISOString().slice(0, 10)}`,
      articleCount: articles.length,
      publishedCount,
      draftCount,
      sizeBytes,
      createdByUid: adminUid,
      createdAt: serverTimestamp(),
    });
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getBackupHistory(): Promise<BackupRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, BACKUPS_COLLECTION));
    const records = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        label: String(data.label || ''),
        articleCount: Number(data.articleCount || 0),
        publishedCount: Number(data.publishedCount || 0),
        draftCount: Number(data.draftCount || 0),
        sizeBytes: Number(data.sizeBytes || 0),
        createdByUid: String(data.createdByUid || ''),
        createdAt: data.createdAt,
      };
    });
    return records.reverse();
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BACKUPS_COLLECTION);
  }
}

export async function deleteBackupRecord(backupId: string): Promise<void> {
  const path = `${BACKUPS_COLLECTION}/${backupId}`;
  try {
    await deleteDoc(doc(db, BACKUPS_COLLECTION, backupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function restoreArticlesFromBackup(
  rawJson: string,
  adminUid: string,
  restoreAsDraft = true
): Promise<number> {
  const parsed = JSON.parse(rawJson) as Partial<FullBackupPayload>;
  if (!parsed || !Array.isArray(parsed.articles)) {
    throw new Error('Invalid backup file format. Expected an articles array.');
  }

  let restoredCount = 0;
  for (const item of parsed.articles) {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) continue;
    const input: ArticleInput = {
      title: item.title,
      slug: item.slug || '',
      category: item.category || 'Make Money Online',
      coverImage: item.coverImage || '',
      content: item.content || '',
      excerpt: item.excerpt || '',
      metaDescription: item.metaDescription || '',
      seoTitle: item.seoTitle || '',
      canonicalUrl: item.canonicalUrl || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      author: item.author || 'HerMoney Editorial',
      publicationDate: item.publicationDate || new Date().toISOString().slice(0, 10),
      status: restoreAsDraft ? 'draft' : item.status === 'published' ? 'published' : 'draft',
    };
    await saveArticle(input, adminUid);
    restoredCount += 1;
  }

  return restoredCount;
}
