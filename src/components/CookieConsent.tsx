import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useConsent } from '../context/ConsentContext';

interface CookieConsentProps {
  onNavigate: (path: string) => void;
}

export function CookieConsent({ onNavigate }: CookieConsentProps) {
  const {
    consent,
    preferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectNonEssential,
    saveCustomPreferences,
  } = useConsent();

  const [analytics, setAnalytics] = useState(consent.analytics);
  const [advertising, setAdvertising] = useState(consent.advertising);

  useEffect(() => {
    setAnalytics(consent.analytics);
    setAdvertising(consent.advertising);
  }, [consent.analytics, consent.advertising, preferencesOpen]);

  return (
    <>
      {!consent.responded && !preferencesOpen && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-[#E8E0DF] shadow-[0_-8px_30px_rgba(31,27,28,0.06)]"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-xs sm:text-sm text-[#5C5355] leading-relaxed max-w-2xl">
              <span className="font-semibold text-[#1F1B1C]">Your privacy matters.</span>{' '}
              HerMoney Studio uses essential cookies to remember your preferences and optional
              advertising cookies (Google AdSense) only with your consent. Read our{' '}
              <button
                type="button"
                onClick={() => onNavigate('/privacy-policy')}
                className="text-[#8E3F4F] underline underline-offset-2 hover:text-[#6B2A38] cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openPreferences}
                className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#1F1B1C] border border-[#E8E0DF] rounded-lg hover:bg-[#F6F0EA] transition-colors whitespace-nowrap cursor-pointer"
              >
                Preferences
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#1F1B1C] border border-[#E8E0DF] rounded-lg hover:bg-[#F6F0EA] transition-colors whitespace-nowrap cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-[#8E3F4F] rounded-lg hover:bg-[#75313F] transition-colors whitespace-nowrap cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 bg-[#1F1B1C]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E8E0DF] rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  GDPR Privacy Controls
                </p>
                <h2 id="cookie-modal-title" className="font-serif text-2xl font-semibold text-[#1F1B1C]">
                  Cookie Preferences
                </h2>
              </div>
              <button
                type="button"
                onClick={closePreferences}
                aria-label="Close cookie preferences"
                className="p-2 rounded-lg text-[#5C5355] hover:bg-[#F6F0EA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#5C5355] leading-relaxed mb-6">
              Choose which categories of cookies and storage you permit on HerMoney Studio. You may
              update your preferences at any time from the footer.
            </p>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-[#FCF9F6] border border-[#E8E0DF] flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1F1B1C]">Essential Storage</h3>
                  <p className="text-xs text-[#5C5355] mt-1 leading-relaxed">
                    Required for site navigation, security, and saving your cookie consent choice.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#8E3F4F] shrink-0 pt-0.5">
                  Always Active
                </span>
              </div>

              <label className="p-4 rounded-lg bg-white border border-[#E8E0DF] flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-[#1F1B1C] block">
                    Analytics &amp; Performance
                  </span>
                  <span className="text-xs text-[#5C5355] mt-1 block leading-relaxed">
                    Helps us understand aggregate readership patterns and improve article structure.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#8E3F4F] rounded cursor-pointer shrink-0"
                />
              </label>

              <label className="p-4 rounded-lg bg-white border border-[#E8E0DF] flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-[#1F1B1C] block">
                    Advertising (Google AdSense)
                  </span>
                  <span className="text-xs text-[#5C5355] mt-1 block leading-relaxed">
                    Permits Google AdSense to display relevant advertisements when enabled by the
                    publisher.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={advertising}
                  onChange={(e) => setAdvertising(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#8E3F4F] rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-[#E8E0DF]">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-[#1F1B1C] border border-[#E8E0DF] rounded-lg hover:bg-[#F6F0EA] transition-colors cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={() => saveCustomPreferences({ analytics, advertising })}
                className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-[#8E3F4F] border border-[#E8B4B8] bg-[#F7EAEB] rounded-lg hover:bg-[#F1DCE0] transition-colors cursor-pointer"
              >
                Save Choices
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-5 py-2.5 min-h-[44px] text-xs font-medium text-white bg-[#8E3F4F] rounded-lg hover:bg-[#75313F] transition-colors cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
