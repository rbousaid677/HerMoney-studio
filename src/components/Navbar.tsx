import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import { BrandLogo } from './BrandLogo';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Navbar({ currentPath, onNavigate }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [currentPath]);

  const isCategoryRoute = currentPath.startsWith('/category/');

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E8E0DF]">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8E3F4F] rounded"
        >
          <BrandLogo compact />
        </a>

        {/* Zone 2: Concise Single-Line Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5355]"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1F1B1C] ${
              currentPath === '/' ? 'text-[#8E3F4F]' : ''
            }`}
          >
            Home
          </a>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#1F1B1C] cursor-pointer py-2 ${
                isCategoryRoute ? 'text-[#8E3F4F]' : ''
              }`}
            >
              <span>Categories</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-[#E8E0DF] rounded-xl shadow-lg py-2 z-40"
              >
                {CATEGORIES.map((category) => {
                  const catPath = `/category/${category.slug}`;
                  const active = currentPath === catPath;
                  return (
                    <a
                      key={category.slug}
                      role="menuitem"
                      href={catPath}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(catPath);
                      }}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        active
                          ? 'bg-[#F7EAEB] text-[#8E3F4F] font-medium'
                          : 'text-[#1F1B1C] hover:bg-[#FCF9F6] hover:text-[#8E3F4F]'
                      }`}
                    >
                      {category.name}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/about');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1F1B1C] ${
              currentPath === '/about' ? 'text-[#8E3F4F]' : ''
            }`}
          >
            About
          </a>

          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/contact');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1F1B1C] ${
              currentPath === '/contact' ? 'text-[#8E3F4F]' : ''
            }`}
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: Notification Bell + Editorial Desk + Mobile Drawer Button */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />

          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/admin');
            }}
            className="hidden md:inline-flex items-center px-4 py-2 text-xs font-medium rounded-lg border border-[#C59B43]/50 bg-[#FCF9F6] text-[#1F1B1C] hover:bg-[#F7EAEB] hover:border-[#8E3F4F]/40 transition-colors whitespace-nowrap shrink-0"
          >
            Editorial Desk
          </a>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[#1F1B1C] hover:bg-[#F6F0EA] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-[#FCF9F6] border-t border-[#E8E0DF] overflow-y-auto z-30">
          <nav aria-label="Mobile navigation" className="px-4 py-6 space-y-6">
            <div>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="block py-3 px-3 rounded-lg text-base font-medium text-[#1F1B1C] hover:bg-[#F7EAEB]"
              >
                Home
              </a>
            </div>

            <div>
              <p className="px-3 text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">
                Categories
              </p>
              <div className="space-y-1">
                {CATEGORIES.map((category) => (
                  <a
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/category/${category.slug}`);
                    }}
                    className="block py-3 px-3 rounded-lg text-sm font-medium text-[#1F1B1C] hover:bg-[#F7EAEB]"
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E0DF]">
              <p className="px-3 text-xs uppercase tracking-widest text-[#5C5355] font-medium mb-2">
                Publication
              </p>
              <div className="space-y-1">
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/about');
                  }}
                  className="block py-2.5 px-3 rounded-lg text-sm text-[#1F1B1C] hover:bg-[#F7EAEB]"
                >
                  About Us
                </a>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/contact');
                  }}
                  className="block py-2.5 px-3 rounded-lg text-sm text-[#1F1B1C] hover:bg-[#F7EAEB]"
                >
                  Contact Us
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E0DF]">
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/admin');
                }}
                className="block w-full text-center py-3 px-4 rounded-lg text-sm font-medium bg-[#8E3F4F] text-white hover:bg-[#75313F]"
              >
                Editorial Desk
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
