import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdSenseSettings, ContactMessage } from '../types';

export const DEFAULT_ADSENSE_SETTINGS: AdSenseSettings = {
  adsenseEnabled: false,
  publisherId: '',
  placements: {
    headerBanner: { enabled: false, slotId: '', format: 'horizontal' },
    homeMidSection: { enabled: false, slotId: '', format: 'auto' },
    categoryTop: { enabled: false, slotId: '', format: 'horizontal' },
    inArticle: { enabled: false, slotId: '', format: 'rectangle' },
    footerBanner: { enabled: false, slotId: '', format: 'horizontal' },
  },
  updatedByUid: '',
};

export function isValidPublisherId(publisherId: string): boolean {
  return /^ca-pub-\d{10,20}$/.test(publisherId.trim());
}

export async function getAdSenseSettings(): Promise<AdSenseSettings> {
  const path = 'siteSettings/adsense';
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'adsense'));
    if (!snap.exists()) {
      return DEFAULT_ADSENSE_SETTINGS;
    }
    const data = snap.data();
    return {
      adsenseEnabled: Boolean(data.adsenseEnabled),
      publisherId: typeof data.publisherId === 'string' ? data.publisherId : '',
      placements: {
        headerBanner: data.placements?.headerBanner || DEFAULT_ADSENSE_SETTINGS.placements.headerBanner,
        homeMidSection:
          data.placements?.homeMidSection || DEFAULT_ADSENSE_SETTINGS.placements.homeMidSection,
        categoryTop: data.placements?.categoryTop || DEFAULT_ADSENSE_SETTINGS.placements.categoryTop,
        inArticle: data.placements?.inArticle || DEFAULT_ADSENSE_SETTINGS.placements.inArticle,
        footerBanner: data.placements?.footerBanner || DEFAULT_ADSENSE_SETTINGS.placements.footerBanner,
      },
      updatedByUid: typeof data.updatedByUid === 'string' ? data.updatedByUid : '',
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    // Public visitors may read before document exists; only throw if permission denied
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    return DEFAULT_ADSENSE_SETTINGS;
  }
}

export async function saveAdSenseSettings(
  settings: Omit<AdSenseSettings, 'updatedByUid' | 'updatedAt'>,
  adminUid: string
): Promise<void> {
  const path = 'siteSettings/adsense';
  try {
    const payload = {
      adsenseEnabled: Boolean(settings.adsenseEnabled),
      publisherId: settings.publisherId.trim().slice(0, 64),
      placements: {
        headerBanner: {
          enabled: Boolean(settings.placements.headerBanner.enabled),
          slotId: settings.placements.headerBanner.slotId.trim().slice(0, 64),
          format: settings.placements.headerBanner.format,
        },
        homeMidSection: {
          enabled: Boolean(settings.placements.homeMidSection.enabled),
          slotId: settings.placements.homeMidSection.slotId.trim().slice(0, 64),
          format: settings.placements.homeMidSection.format,
        },
        categoryTop: {
          enabled: Boolean(settings.placements.categoryTop.enabled),
          slotId: settings.placements.categoryTop.slotId.trim().slice(0, 64),
          format: settings.placements.categoryTop.format,
        },
        inArticle: {
          enabled: Boolean(settings.placements.inArticle.enabled),
          slotId: settings.placements.inArticle.slotId.trim().slice(0, 64),
          format: settings.placements.inArticle.format,
        },
        footerBanner: {
          enabled: Boolean(settings.placements.footerBanner.enabled),
          slotId: settings.placements.footerBanner.slotId.trim().slice(0, 64),
          format: settings.placements.footerBanner.format,
        },
      },
      updatedByUid: adminUid,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'siteSettings', 'adsense'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  consentAccepted: boolean;
}): Promise<void> {
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `contactMessages/${id}`;
  try {
    await setDoc(doc(db, 'contactMessages', id), {
      name: input.name.trim().slice(0, 120),
      email: input.email.trim().slice(0, 180),
      subject: input.subject.trim().slice(0, 200),
      message: input.message.trim().slice(0, 4000),
      consentAccepted: Boolean(input.consentAccepted),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const path = 'contactMessages';
  try {
    const snapshot = await getDocs(collection(db, path));
    const items = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        email: String(data.email || ''),
        subject: String(data.subject || ''),
        message: String(data.message || ''),
        consentAccepted: Boolean(data.consentAccepted),
        createdAt: data.createdAt,
      };
    });
    return items.reverse();
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteContactMessage(id: string): Promise<void> {
  const path = `contactMessages/${id}`;
  try {
    await deleteDoc(doc(db, 'contactMessages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
