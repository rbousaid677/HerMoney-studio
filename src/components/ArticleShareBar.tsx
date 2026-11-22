import { useEffect, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface ArticleShareBarProps {
  title: string;
  description?: string;
  url: string;
  variant?: 'top' | 'bottom';
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 22v-8.2h2.75l.41-3.2H13.5V8.55c0-.93.26-1.56 1.59-1.56h1.7V4.13c-.29-.04-1.3-.13-2.47-.13-2.45 0-4.12 1.49-4.12 4.24v2.36H7.44v3.2h2.76V22h3.3z" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.78 14.07c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.83-.12-.42-.13-.96-.31-1.65-.61-2.91-1.26-4.81-4.19-4.96-4.39-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.19-.15.32-.29.49-.15.17-.31.38-.44.51-.14.14-.29.3-.13.59.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.29 2.33 1.44.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.66-.14.27.1 1.7.8 1.99.95.29.14.49.22.56.34.07.12.07.7-.17 1.38z" />
    </svg>
  );
}

function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ArticleShareBar({
  title,
  description = '',
  url,
  variant = 'top',
}: ArticleShareBarProps) {
  const { showToast } = useNotifications();
  const [copied, setCopied] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);

  useEffect(() => {
    setSupportsNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  const cleanUrl = url.trim();

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    cleanUrl
  )}`;
  const whatsappText = [cleanTitle, cleanDescription, cleanUrl].filter(Boolean).join('\n\n');
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    cleanTitle
  )}&url=${encodeURIComponent(cleanUrl)}`;

  async function handleCopyLink() {
    let didCopy = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(cleanUrl);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = cleanUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        didCopy = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      showToast('success', 'Link Copied', 'Article link copied to your clipboard.');
    } else {
      showToast('error', 'Copy Failed', 'Could not copy the article link automatically.');
    }
  }

  async function handleNativeShare() {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: cleanTitle,
        text: cleanDescription || cleanTitle,
        url: cleanUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showToast('error', 'Share Unavailable', 'Could not open your device share menu.');
    }
  }

  const baseButtonClass =
    'inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E8E0DF] bg-white text-xs font-medium text-[#1F1B1C] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8E3F4F]/45 hover:bg-[#F7EAEB]/45 hover:text-[#8E3F4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E3F4F] cursor-pointer';

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={facebookShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={baseButtonClass}
      >
        <FacebookIcon className="w-3.5 h-3.5 text-[#8E3F4F]" />
        <span>Facebook</span>
      </a>

      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className={baseButtonClass}
      >
        <WhatsAppIcon className="w-3.5 h-3.5 text-[#8E3F4F]" />
        <span>WhatsApp</span>
      </a>

      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
        className={baseButtonClass}
      >
        <XIcon className="w-3.5 h-3.5 text-[#8E3F4F]" />
        <span>X</span>
      </a>

      <button
        type="button"
        onClick={() => void handleCopyLink()}
        aria-label="Copy article link"
        className={`${baseButtonClass} ${
          copied ? 'border-[#C59B43] bg-[#F4EAD5]/50 text-[#1F1B1C]' : ''
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-[#C59B43]" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5 text-[#8E3F4F]" />
            <span>Copy Link</span>
          </>
        )}
      </button>

      {supportsNativeShare && (
        <button
          type="button"
          onClick={() => void handleNativeShare()}
          aria-label="Share using device share sheet"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg border border-[#C59B43]/60 bg-[#FCF9F6] text-xs font-medium text-[#1F1B1C] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F4EAD5]/60 hover:border-[#8E3F4F]/50 hover:text-[#8E3F4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E3F4F] cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-[#C59B43]" />
          <span>Share</span>
        </button>
      )}
    </div>
  );

  if (variant === 'bottom') {
    return (
      <section
        aria-label="Share this article"
        className="mt-10 p-6 sm:p-7 bg-white border border-[#E8E0DF] rounded-xl"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-1">
              Share This Article
            </p>
            <h2 className="font-serif text-xl font-semibold text-[#1F1B1C]">
              Pass this editorial guide along
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5355] mt-1">
              Share with friends, colleagues, or bookmark the link for later reading.
            </p>
          </div>
          {buttons}
        </div>
      </section>
    );
  }

  return (
    <div
      aria-label="Share this article"
      className="mt-5 pt-4 border-t border-[#E8E0DF]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <span className="text-xs uppercase tracking-[0.18em] text-[#8E3F4F] font-medium shrink-0">
        Share this article
      </span>
      {buttons}
    </div>
  );
}
