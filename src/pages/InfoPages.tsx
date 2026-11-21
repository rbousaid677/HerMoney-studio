import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import { useConsent } from '../context/ConsentContext';
import { useNotifications } from '../context/NotificationContext';
import { submitContactMessage } from '../services/settingsService';
import { applySeoMetadata } from '../utils/seo';
import { SafeImage } from '../components/SafeImage';

interface InfoPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: InfoPageProps) {
  useEffect(() => {
    applySeoMetadata({
      title: 'About Us | HerMoney Studio',
      description:
        'Learn about HerMoney Studio, an editorial digital magazine focused on online income, remote work, freelancing, small business, passive income, and blogging.',
      canonicalPath: '/about',
    });
  }, []);

  return (
    <div className="bg-[#FCF9F6]">
      <section className="bg-white border-b border-[#E8E0DF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-3">
              About HerMoney Studio
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1F1B1C] leading-tight mb-5 text-wrap-balance">
              Clarity, Craft, and Practical Financial Independence
            </h1>
            <p className="text-base text-[#5C5355] leading-relaxed mb-4">
              HerMoney Studio is an independent digital business magazine created for readers
              building modern, flexible income streams with intention and discipline.
            </p>
            <p className="text-base text-[#5C5355] leading-relaxed">
              We publish long-form guides, realistic business breakdowns, and editorial features
              across six focused pillars—avoiding hype in favor of enduring skills and sound
              financial judgment.
            </p>
          </div>
          <div className="lg:col-span-6 aspect-[4/3] rounded-xl overflow-hidden border border-[#E8E0DF] bg-[#F6F0EA]">
            <SafeImage
              src="/src/assets/images/about_studio_lounge_1795205654915.jpg"
              alt="Sunlit HerMoney Studio editorial lounge"
              fallbackTitle="HerMoney Studio"
              priority
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1F1B1C] mb-8">
          Our Six Editorial Pillars
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((category, idx) => (
            <div key={category.slug} className="p-6 bg-white border border-[#E8E0DF] rounded-xl">
              <span className="font-mono text-xs text-[#C59B43] tabular-nums block mb-2">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h3 className="font-serif text-xl font-semibold text-[#1F1B1C] mb-2">
                {category.name}
              </h3>
              <p className="text-sm text-[#5C5355] leading-relaxed mb-4">
                {category.description}
              </p>
              <a
                href={`/category/${category.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/category/${category.slug}`);
                }}
                className="text-xs font-medium text-[#8E3F4F] hover:underline underline-offset-4"
              >
                Explore {category.name}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ContactPage({ onNavigate }: InfoPageProps) {
  const { showToast } = useNotifications();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applySeoMetadata({
      title: 'Contact Us | HerMoney Studio',
      description:
        'Reach the HerMoney Studio editorial desk for reader questions, corrections, partnerships, or privacy inquiries.',
      canonicalPath: '/contact',
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !subject.trim() || message.trim().length < 10) {
      setError('Please complete all fields with a message of at least 10 characters.');
      return;
    }
    if (!consentAccepted) {
      setError('Please confirm consent to our Privacy Policy before sending your message.');
      return;
    }

    setSubmitting(true);
    try {
      await submitContactMessage({
        name,
        email,
        subject,
        message,
        consentAccepted,
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setConsentAccepted(false);
      showToast('success', 'Inquiry Sent', 'Your message has been delivered to our editorial team.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send message. Please try again.';
      setError(msg);
      showToast('error', 'Message Not Sent', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-2">
          Reader &amp; Editorial Inquiries
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1F1B1C] mb-4">
          Contact HerMoney Studio
        </h1>
        <p className="text-base text-[#5C5355] leading-relaxed max-w-2xl">
          Have an editorial question, feedback on a published guide, or a privacy request? Send a
          note directly to our team using the form below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-[#E8E0DF] rounded-xl p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#8E3F4F] mx-auto mb-3" />
              <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-2">
                Message Received
              </h2>
              <p className="text-sm text-[#5C5355] leading-relaxed mb-6">
                Thank you for writing to HerMoney Studio. Our editorial team reviews incoming
                messages regularly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 rounded-lg border border-[#E8E0DF] text-sm font-medium text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-[#1F1B1C] mb-1.5">
                  Full Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-[#1F1B1C] mb-1.5">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={180}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-sm font-medium text-[#1F1B1C] mb-1.5">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  placeholder="Editorial inquiry, feedback, or privacy request"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-[#1F1B1C] mb-1.5">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  placeholder="Write your message here (minimum 10 characters)..."
                />
              </div>

              <label className="flex items-start gap-3 text-xs text-[#5C5355] leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#8E3F4F] shrink-0"
                />
                <span>
                  I consent to HerMoney Studio storing my submitted contact details solely to
                  respond to this inquiry, in accordance with the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/privacy-policy')}
                    className="text-[#8E3F4F] underline underline-offset-2 cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              {error && (
                <p role="alert" className="text-xs text-[#9E2A3B] bg-[#F7EAEB] px-3.5 py-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submitting ? 'Sending Message...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white border border-[#E8E0DF] rounded-xl">
            <Mail className="w-5 h-5 text-[#C59B43] mb-3" />
            <h2 className="font-serif text-xl font-semibold text-[#1F1B1C] mb-2">
              Editorial Guidelines
            </h2>
            <p className="text-sm text-[#5C5355] leading-relaxed mb-4">
              HerMoney Studio maintains independent editorial standards. We do not sell guaranteed
              income programs or accept undisclosed paid placements.
            </p>
            <p className="text-xs text-[#5C5355] leading-relaxed">
              For legal notices, data access/deletion requests under GDPR, or correction requests,
              specify &ldquo;Privacy Request&rdquo; or &ldquo;Editorial Correction&rdquo; in the
              subject line.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LegalPageShell({
  kicker,
  title,
  updatedDate,
  children,
}: {
  kicker: string;
  title: string;
  updatedDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="pb-8 mb-8 border-b border-[#E8E0DF]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-2">
          {kicker}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1F1B1C] mb-3">
          {title}
        </h1>
        <p className="text-xs text-[#5C5355]">Last updated: {updatedDate}</p>
      </header>
      <div className="space-y-6 text-sm sm:text-base text-[#2A2425] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage({ onNavigate }: InfoPageProps) {
  const { openPreferences } = useConsent();

  useEffect(() => {
    applySeoMetadata({
      title: 'Privacy Policy | HerMoney Studio',
      description:
        'Read the HerMoney Studio Privacy Policy detailing GDPR rights, cookie consent choices, Firebase infrastructure, and Google AdSense disclosures.',
      canonicalPath: '/privacy-policy',
    });
  }, []);

  return (
    <LegalPageShell kicker="Legal & Privacy" title="Privacy Policy" updatedDate="November 2026">
      <p>
        HerMoney Studio (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your
        privacy and is committed to protecting personal information in accordance with applicable
        data protection laws, including the General Data Protection Regulation (GDPR) and the
        ePrivacy Directive.
      </p>

      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        1. Information We Collect
      </h2>
      <p>
        Public visitors can browse and read articles on HerMoney Studio without creating an account
        or registering. We collect personal information only when you voluntarily submit an inquiry
        through our Contact Us form (name, email address, subject, and message), or when technical
        preference data is stored locally in your browser to remember your cookie consent choices.
      </p>

      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        2. Cookies &amp; Consent Management (GDPR)
      </h2>
      <p>
        We categorize browser storage and cookies into three groups: Essential Storage (always
        active to store your consent preference and ensure site security), Analytics &amp;
        Performance (optional, loaded only with consent), and Advertising (optional, used only when
        Google AdSense is configured and you grant advertising consent).
      </p>
      <p>
        You may withdraw or update your consent preferences at any time by clicking{' '}
        <button
          type="button"
          onClick={openPreferences}
          className="text-[#8E3F4F] underline underline-offset-2 cursor-pointer"
        >
          Manage Cookie Preferences
        </button>
        .
      </p>

      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        3. Google AdSense &amp; Third-Party Advertising
      </h2>
      <p>
        When Google AdSense is enabled by the publisher and you provide advertising consent, Google
        and its partners may use cookies or device identifiers to serve advertisements based on your
        visit to this site or other sites on the internet. Users may manage personalized ad settings
        via Google Ads Settings or withdraw advertising consent through our Cookie Preferences
        panel.
      </p>

      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        4. Infrastructure &amp; Data Hosting
      </h2>
      <p>
        HerMoney Studio uses Google Firebase (Firebase Hosting, Cloud Firestore, and Firebase
        Storage) to host editorial content and store voluntary contact form submissions securely.
        Contact submissions are accessible strictly to authorized site administrators.
      </p>

      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        5. Your Rights Under GDPR
      </h2>
      <p>
        If you reside in the European Economic Area (EEA) or United Kingdom, you have the right to
        request access to, correction of, restriction of, or deletion of personal data you have
        submitted to us, as well as the right to withdraw consent at any time. To exercise these
        rights, please reach out via our{' '}
        <a
          href="/contact"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/contact');
          }}
          className="text-[#8E3F4F] underline underline-offset-2"
        >
          Contact Us
        </a>{' '}
        page.
      </p>
    </LegalPageShell>
  );
}

export function TermsPage({ onNavigate }: InfoPageProps) {
  useEffect(() => {
    applySeoMetadata({
      title: 'Terms & Conditions | HerMoney Studio',
      description:
        'Review the Terms and Conditions governing access to and use of HerMoney Studio.',
      canonicalPath: '/terms-and-conditions',
    });
  }, []);

  return (
    <LegalPageShell kicker="Legal" title="Terms & Conditions" updatedDate="November 2026">
      <p>
        By accessing or using HerMoney Studio, you agree to comply with these Terms &amp;
        Conditions. If you do not agree with any portion of these terms, please discontinue use of
        the website.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        1. Intellectual Property
      </h2>
      <p>
        All editorial articles, branding, logos, layout designs, and original photography published
        on HerMoney Studio are protected by copyright and intellectual property laws. You may read
        and share links to our articles for personal, non-commercial use, provided proper attribution
        is maintained. Reproduction or republication of full articles without written permission is
        prohibited.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        2. Acceptable Use
      </h2>
      <p>
        You agree not to misuse this website, attempt unauthorized access to administrative systems
        or databases, scrape content automatically in violation of our robots directives, or submit
        spam or malicious code through our contact forms.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        3. External Links &amp; Third-Party Services
      </h2>
      <p>
        Articles may reference third-party tools, platforms, or resources. HerMoney Studio is not
        responsible for the content, availability, or privacy practices of external websites.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        4. Limitation of Liability
      </h2>
      <p>
        HerMoney Studio is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis. To the fullest extent permitted by law, we disclaim warranties of any kind and shall
        not be liable for indirect or consequential damages arising from reliance on published
        informational content. Questions may be sent via our{' '}
        <a
          href="/contact"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/contact');
          }}
          className="text-[#8E3F4F] underline underline-offset-2"
        >
          Contact Us
        </a>{' '}
        page.
      </p>
    </LegalPageShell>
  );
}

export function DisclaimerPage() {
  useEffect(() => {
    applySeoMetadata({
      title: 'Disclaimer | HerMoney Studio',
      description:
        'Read the HerMoney Studio financial, business, and earnings disclaimer.',
      canonicalPath: '/disclaimer',
    });
  }, []);

  return (
    <LegalPageShell kicker="Disclosures" title="Disclaimer" updatedDate="November 2026">
      <p>
        The content published on HerMoney Studio—covering making money online, remote work,
        freelancing, small business ideas, passive income, and blogging—is provided strictly for
        general educational and informational purposes.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        Not Professional Financial, Legal, or Tax Advice
      </h2>
      <p>
        Nothing on this website constitutes personalized financial, investment, legal, accounting,
        or tax advice. Readers should consult qualified professionals before making significant
        business, tax, or investment decisions tailored to their individual circumstances.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        No Earnings Guarantees
      </h2>
      <p>
        Any business models, revenue strategies, or case discussions mentioned in our articles
        illustrate concepts and possibilities rather than guaranteed outcomes. Individual results
        depend on effort, market conditions, prior skills, capital, and execution.
      </p>
    </LegalPageShell>
  );
}

export function AffiliateDisclosurePage() {
  useEffect(() => {
    applySeoMetadata({
      title: 'Affiliate Disclosure | HerMoney Studio',
      description:
        'FTC-compliant affiliate transparency statement for HerMoney Studio.',
      canonicalPath: '/affiliate-disclosure',
    });
  }, []);

  return (
    <LegalPageShell kicker="Transparency" title="Affiliate Disclosure" updatedDate="November 2026">
      <p>
        In accordance with the Federal Trade Commission (FTC) guidelines concerning the use of
        endorsements and testimonials in advertising, HerMoney Studio provides this disclosure
        regarding potential affiliate relationships.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        How Affiliate Links Work
      </h2>
      <p>
        Some articles on HerMoney Studio may contain links to third-party products, software,
        books, or business services. If you click on an affiliate link and complete a qualifying
        purchase or sign-up, HerMoney Studio may earn a commission at no additional cost to you.
      </p>
      <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] pt-4">
        Editorial Independence
      </h2>
      <p>
        Affiliate partnerships never dictate our editorial judgment. Our primary revenue structure
        is display advertising via Google AdSense (when configured), and any recommended tools or
        platforms are selected based on practical utility and relevance to our readers.
      </p>
    </LegalPageShell>
  );
}
