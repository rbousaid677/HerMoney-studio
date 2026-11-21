import { CATEGORIES } from '../constants/categories';
import { useConsent } from '../context/ConsentContext';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigate: (path: string) => void;
}

const INFO_LINKS = [
  { label: 'About Us', path: '/about' },
  { label: 'Contact Us', path: '/contact' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Terms & Conditions', path: '/terms-and-conditions' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'Affiliate Disclosure', path: '/affiliate-disclosure' },
];

export function Footer({ onNavigate }: FooterProps) {
  const { openPreferences } = useConsent();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E8E0DF] text-[#1F1B1C]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[#E8E0DF]">
          {/* Brand Identity & Website Information */}
          <div className="md:col-span-5">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="inline-block mb-4"
            >
              <BrandLogo />
            </a>
            <p className="text-sm text-[#5C5355] leading-relaxed max-w-sm mb-4">
              HerMoney Studio is an independent digital business magazine dedicated to thoughtful
              reporting on online income, remote work, freelancing, small business launches,
              passive income, and digital publishing.
            </p>
            <p className="text-xs text-[#5C5355]">
              Editorial content is published in English for educational and informational purposes.
            </p>
          </div>

          {/* Six Categories */}
          <div className="md:col-span-4">
            <h2 className="text-xs uppercase tracking-widest text-[#8E3F4F] font-semibold mb-4 font-sans">
              Editorial Categories
            </h2>
            <ul className="space-y-2.5">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <a
                    href={`/category/${category.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/category/${category.slug}`);
                    }}
                    className="text-sm text-[#5C5355] hover:text-[#8E3F4F] transition-colors"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Six Required Information & Policy Pages */}
          <div className="md:col-span-3">
            <h2 className="text-xs uppercase tracking-widest text-[#8E3F4F] font-semibold mb-4 font-sans">
              Information &amp; Policies
            </h2>
            <ul className="space-y-2.5">
              {INFO_LINKS.map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.path);
                    }}
                    className="text-sm text-[#5C5355] hover:text-[#8E3F4F] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-sm text-[#5C5355] hover:text-[#8E3F4F] transition-colors cursor-pointer text-left"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Legal Notice */}
        <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[#5C5355]">
          <p>&copy; {currentYear} HerMoney Studio. All rights reserved.</p>
          <p>
            Independent Digital Publication &middot;{' '}
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/admin');
              }}
              className="hover:text-[#8E3F4F] transition-colors"
            >
              Editorial Desk
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
