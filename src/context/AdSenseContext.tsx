import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_ADSENSE_SETTINGS, getAdSenseSettings } from '../services/settingsService';
import { AdSenseSettings } from '../types';

interface AdSenseContextValue {
  settings: AdSenseSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const AdSenseContext = createContext<AdSenseContextValue | null>(null);

export function AdSenseProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdSenseSettings>(DEFAULT_ADSENSE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const next = await getAdSenseSettings();
      setSettings(next);
    } catch {
      setSettings(DEFAULT_ADSENSE_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return (
    <AdSenseContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </AdSenseContext.Provider>
  );
}

export function useAdSense(): AdSenseContextValue {
  const ctx = useContext(AdSenseContext);
  if (!ctx) {
    throw new Error('useAdSense must be used inside AdSenseProvider');
  }
  return ctx;
}
