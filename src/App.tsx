import { useCallback, useEffect, useState } from 'react';
import { AdSenseSlot } from './components/AdSenseSlot';
import { CookieConsent } from './components/CookieConsent';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { NotificationPopupModal } from './components/NotificationPopupModal';
import { ToastContainer } from './components/ToastContainer';
import { AdSenseProvider } from './context/AdSenseContext';
import { AuthProvider } from './context/AuthContext';
import { ConsentProvider } from './context/ConsentContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { ArticlePage } from './pages/ArticlePage';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import {
  AboutPage,
  AffiliateDisclosurePage,
  ContactPage,
  DisclaimerPage,
  PrivacyPolicyPage,
  TermsPage,
} from './pages/InfoPages';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function AppRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizePath(typeof window !== 'undefined' ? window.location.pathname : '/')
  );

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(normalizePath(window.location.pathname));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = normalizePath(to);
    if (typeof window !== 'undefined' && window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');

  function renderRoute() {
    if (currentPath === '/') {
      return <HomePage onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/category/')) {
      const slug = decodeURIComponent(currentPath.replace('/category/', ''));
      return <CategoryPage slug={slug} onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/article/')) {
      const slug = decodeURIComponent(currentPath.replace('/article/', ''));
      return <ArticlePage slug={slug} onNavigate={navigate} />;
    }

    if (currentPath === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }
    if (currentPath === '/contact') {
      return <ContactPage onNavigate={navigate} />;
    }
    if (currentPath === '/privacy-policy') {
      return <PrivacyPolicyPage onNavigate={navigate} />;
    }
    if (currentPath === '/terms-and-conditions') {
      return <TermsPage onNavigate={navigate} />;
    }
    if (currentPath === '/disclaimer') {
      return <DisclaimerPage />;
    }
    if (currentPath === '/affiliate-disclosure') {
      return <AffiliateDisclosurePage />;
    }
    if (isAdminRoute) {
      return <AdminDashboard onNavigate={navigate} />;
    }

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">404</p>
        <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C] mb-4">
          Page Not Found
        </h1>
        <p className="text-sm text-[#5C5355] mb-8">
          The page you requested could not be found on HerMoney Studio.
        </p>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F]"
        >
          Return to Homepage
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F6] text-[#1F1B1C]">
      <Navbar currentPath={currentPath} onNavigate={navigate} />

      <main className="flex-1 pt-16">
        {!isAdminRoute && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AdSenseSlot placement="headerBanner" />
          </div>
        )}

        {renderRoute()}

        {!isAdminRoute && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <AdSenseSlot placement="footerBanner" />
          </div>
        )}
      </main>

      {!isAdminRoute && <Footer onNavigate={navigate} />}
      <CookieConsent onNavigate={navigate} />
      <NotificationPopupModal onNavigate={navigate} />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <ConsentProvider>
            <AdSenseProvider>
              <AppRouter />
            </AdSenseProvider>
          </ConsentProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
