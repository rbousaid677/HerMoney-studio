import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { CATEGORIES, INITIAL_ARTICLE_SLOT_COUNT } from '../constants/categories';
import { getPublishedArticles } from '../services/articleService';
import { Article } from '../types';
import { applySeoMetadata, getCanonicalBaseUrl } from '../utils/seo';
import { AdSenseSlot } from '../components/AdSenseSlot';
import { ArticleCard } from '../components/ArticleCard';
import { SafeImage } from '../components/SafeImage';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = getCanonicalBaseUrl();
    applySeoMetadata({
      title: 'HerMoney Studio — Modern Business & Wealth Editorial Magazine',
      description:
        'HerMoney Studio is an independent digital magazine covering online income, remote work, freelancing, small business strategy, passive income, and blogging.',
      canonicalPath: '/',
      ogType: 'website',
      schemaJson: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'HerMoney Studio',
        url: baseUrl,
        description:
          'Modern business magazine for making money online, remote work, freelancing, small business ideas, passive income, and blogging.',
      },
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await getPublishedArticles();
        if (active) setArticles(items);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load published articles.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const remainingInitialSlots = Math.max(0, INITIAL_ARTICLE_SLOT_COUNT - articles.length);

  return (
    <div>
      {/* Editorial Hero Section */}
      <section className="bg-[#FCF9F6] border-b border-[#E8E0DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20">
          {/* Headline & Introductory Text */}
          <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-4">
              Digital Business &amp; Financial Independence Magazine
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-[#1F1B1C] leading-[1.12] tracking-tight mb-5 text-wrap-balance">
              Thoughtful Strategies for Modern Income &amp; Independent Work
            </h1>
            <p className="text-base sm:text-lg text-[#5C5355] leading-relaxed max-w-2xl mx-auto">
              HerMoney Studio pairs practical financial clarity with modern editorial craft —
              exploring online revenue streams, remote careers, independent consulting, small
              business foundations, and sustainable digital publishing.
            </p>
          </div>

          {/* Hero Images Displayed Below the Introductory Text */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 aspect-[16/9] lg:aspect-auto lg:h-[420px] rounded-xl overflow-hidden border border-[#E8E0DF] bg-white">
              <SafeImage
                src="/src/assets/images/hero_editorial_studio_1795205654263.jpg"
                alt="Sunlit HerMoney Studio editorial desk with linen portfolio and gold pen"
                fallbackTitle="HerMoney Studio Editorial Desk"
                priority
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-4 aspect-[4/3] lg:aspect-auto lg:h-[420px] rounded-xl overflow-hidden border border-[#E8E0DF] bg-white">
              <SafeImage
                src="/src/assets/images/hero_editorial_detail_1795205673163.jpg"
                alt="Editorial linen notebook, brushed gold fountain pen, and espresso on travertine"
                fallbackTitle="Editorial Planning & Craft"
                priority
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Six Editorial Categories Directory */}
      <section className="bg-white border-b border-[#E8E0DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="font-serif text-xl font-semibold text-[#1F1B1C]">
              Explore Our Six Editorial Desks
            </h2>
            <span className="text-xs text-[#5C5355]">Select a topic to read category features</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((category) => (
              <a
                key={category.slug}
                href={`/category/${category.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/category/${category.slug}`);
                }}
                className="group p-3.5 rounded-lg border border-[#E8E0DF] bg-[#FCF9F6] hover:bg-[#F7EAEB] hover:border-[#E8B4B8] transition-colors flex items-center justify-between gap-2 min-h-[52px]"
              >
                <span className="text-xs sm:text-sm font-medium text-[#1F1B1C] group-hover:text-[#8E3F4F] leading-snug">
                  {category.name}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C59B43] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Configurable AdSense Placement (Hidden unless configured & consented) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <AdSenseSlot placement="homeMidSection" />
      </div>

      {/* Latest Articles — Consistent 3-Column Editorial Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#E8E0DF]">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1.5">
              Latest Dispatches
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
              Editorial Archive
            </h2>
          </div>
          <p className="text-sm text-[#5C5355] tabular-nums">
            {articles.length} {articles.length === 1 ? 'Article' : 'Articles'} Published
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white border border-[#E8E0DF] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#F6F0EA]" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-32 bg-[#F6F0EA] rounded" />
                  <div className="h-5 w-full bg-[#F6F0EA] rounded" />
                  <div className="h-4 w-5/6 bg-[#F6F0EA] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-8 bg-white border border-[#E8E0DF] rounded-xl text-center">
            <p className="text-sm text-[#8E3F4F] font-medium mb-2">Could not load articles</p>
            <p className="text-xs text-[#5C5355]">{error}</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* Structured 10-Article Launch Index (Shown without inventing titles when awaiting initial articles) */}
        {!loading && !error && remainingInitialSlots > 0 && (
          <div
            className={`${
              articles.length > 0 ? 'mt-12 pt-10 border-t border-[#E8E0DF]' : ''
            } bg-white border border-[#E8E0DF] rounded-xl p-6 sm:p-10`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Inaugural Collection
                </p>
                <h3 className="font-serif text-2xl font-semibold text-[#1F1B1C]">
                  {articles.length === 0
                    ? 'Prepared for Ten Founding Editorial Features'
                    : `${remainingInitialSlots} Remaining Founding Editorial Slots`}
                </h3>
                <p className="text-sm text-[#5C5355] mt-1.5 max-w-2xl">
                  {articles.length === 0
                    ? 'HerMoney Studio is ready for publication. Articles authored and published in the Editorial Desk will appear automatically in this three-column magazine grid.'
                    : 'Additional founding articles published in the Editorial Desk will populate the remaining inaugural slots automatically.'}
                </p>
              </div>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/admin');
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open Editorial Desk</span>
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: INITIAL_ARTICLE_SLOT_COUNT }, (_, idx) => {
                const publishedItem = articles[idx];
                const slotNum = String(idx + 1).padStart(2, '0');
                return (
                  <div
                    key={slotNum}
                    className={`p-3.5 rounded-lg border text-xs ${
                      publishedItem
                        ? 'bg-[#F7EAEB] border-[#E8B4B8] text-[#1F1B1C]'
                        : 'bg-[#FCF9F6] border-[#E8E0DF] text-[#5C5355]'
                    }`}
                  >
                    <span className="font-mono tabular-nums text-[11px] text-[#8E3F4F] block mb-1">
                      Slot {slotNum}
                    </span>
                    {publishedItem ? (
                      <a
                        href={`/article/${publishedItem.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(`/article/${publishedItem.slug}`);
                        }}
                        className="font-medium text-[#1F1B1C] hover:text-[#8E3F4F] line-clamp-2"
                      >
                        {publishedItem.title}
                      </a>
                    ) : (
                      <span>Awaiting publication</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
