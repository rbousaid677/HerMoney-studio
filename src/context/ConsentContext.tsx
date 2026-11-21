import React, { createContext, useContext, useState } from 'react';
import { ConsentPreferences } from '../types';

const CONSENT_STORAGE_KEY = 'hermoney_gdpr_consent_v1';

const DEFAULT_CONSENT: ConsentPreferences = {
  responded: false,
  essential: true,
  analytics: false,
  advertising: false,
  updatedAt: '',
};

function loadInitialConsent(): ConsentPreferences {
  if (typeof window === 'undefined') return DEFAULT_CONSENT;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    return {
      responded: Boolean(parsed.responded),
      essential: true,
      analytics: Boolean(parsed.analytics),
      advertising: Boolean(parsed.advertising),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

interface ConsentContextValue {
  consent: ConsentPreferences;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveCustomPreferences: (prefs: { analytics: boolean; advertising: boolean }) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences>(loadInitialConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  function persist(next: ConsentPreferences) {
    setConsent(next);
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota exceptions
    }
  }

  function acceptAll() {
    persist({
      responded: true,
      essential: true,
      analytics: true,
      advertising: true,
      updatedAt: new Date().toISOString(),
    });
    setPreferencesOpen(false);
  }

  function rejectNonEssential() {
    persist({
      responded: true,
      essential: true,
      analytics: false,
      advertising: false,
      updatedAt: new Date().toISOString(),
    });
    setPreferencesOpen(false);
  }

  function saveCustomPreferences(prefs: { analytics: boolean; advertising: boolean }) {
    persist({
      responded: true,
      essential: true,
      analytics: prefs.analytics,
      advertising: prefs.advertising,
      updatedAt: new Date().toISOString(),
    });
    setPreferencesOpen(false);
  }

  return (
    <ConsentContext.Provider
      value={{
        consent,
        preferencesOpen,
        openPreferences: () => setPreferencesOpen(true),
        closePreferences: () => setPreferencesOpen(false),
        acceptAll,
        rejectNonEssential,
        saveCustomPreferences,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used inside ConsentProvider');
  }
  return ctx;
}
