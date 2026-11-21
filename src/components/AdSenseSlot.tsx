import { useEffect, useRef } from 'react';
import { useAdSense } from '../context/AdSenseContext';
import { useConsent } from '../context/ConsentContext';
import { isValidPublisherId } from '../services/settingsService';
import { AdPlacementKey } from '../types';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseSlotProps {
  placement: AdPlacementKey;
  className?: string;
}

export function AdSenseSlot({ placement, className = '' }: AdSenseSlotProps) {
  const { settings } = useAdSense();
  const { consent } = useConsent();
  const pushedRef = useRef(false);

  const slotConfig = settings.placements[placement];
  const validPubId = isValidPublisherId(settings.publisherId);
  const slotReady = Boolean(
    settings.adsenseEnabled &&
      validPubId &&
      slotConfig?.enabled &&
      slotConfig.slotId.trim() &&
      consent.responded &&
      consent.advertising
  );

  useEffect(() => {
    if (!slotReady || typeof document === 'undefined') return;

    const existingScript = document.querySelector(
      'script[data-hermoney-adsense="true"]'
    ) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        settings.publisherId.trim()
      )}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-hermoney-adsense', 'true');
      document.head.appendChild(script);
    }

    if (!pushedRef.current) {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushedRef.current = true;
      } catch {
        // AdSense script still loading or blocked by user extension
      }
    }
  }, [slotReady, settings.publisherId]);

  // Do not insert advertisements or fake placeholders before valid AdSense configuration and GDPR consent
  if (!slotReady) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`my-8 py-4 px-4 bg-[#F6F0EA] border border-[#E8E0DF] rounded-lg text-center ${className}`}
    >
      <p className="text-[11px] uppercase tracking-widest text-[#5C5355] mb-3 font-medium">
        Advertisement
      </p>
      <div className="overflow-hidden min-h-[90px] flex items-center justify-center">
        <ins
          className="adsbygoogle block w-full"
          style={{ display: 'block' }}
          data-ad-client={settings.publisherId.trim()}
          data-ad-slot={slotConfig.slotId.trim()}
          data-ad-format={slotConfig.format || 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
