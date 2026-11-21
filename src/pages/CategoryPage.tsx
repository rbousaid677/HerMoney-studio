import { useEffect, useState } from 'react';
import { getCategoryBySlug } from '../constants/categories';
import { getPublishedArticlesByCategory } from '../services/articleService';
import { Article } from '../types';
import { applySeoMetadata } from '../utils/seo';
import { AdSenseSlot } from '../components/AdSenseSlot';
import { ArticleCard } from '../components/ArticleCard';

interface CategoryPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export function CategoryPage({ slug, onNavigate }: CategoryPageProps) {
  const category = getCategoryBySlug(slug);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    applySeoMetadata({
      title: `${category.name} | HerMoney Studio`,
      description: category.description,
      canonicalPath: `/category/${category.slug}`,
      ogType: 'website',
    });
  }, [category]);

  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }
    const categoryName = category.name;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await getPublishedArticlesByCategory(categoryName);
        if (active) setArticles(items);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load category articles.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [category]);

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">
          Category Not Found
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C] mb-4">
          This editorial section does not exist
        </h1>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F]"
        >
          Return to Homepage
        </a>
      </div>
    );
  }

  const featuredArticle = articles[0] || null;
  const remainingArticles = articles.slice(1);

  return (
    <div>
      {/* Category Header */}
      <section className="bg-white border-b border-[#E8E0DF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8E3F4F] font-medium mb-3">
            Editorial Category
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#1F1B1C] mb-4 text-wrap-balance">
            {category.name}
          </h1>
          <p className="text-base sm:text-lg text-[#5C5355] leading-relaxed max-w-2xl">
            {category.description}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <AdSenseSlot placement="categoryTop" />
      </div>

      {/* Mixed Editorial Layout: Featured Article + 3-Column Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading && (
          <div className="space-y-8 animate-pulse">
            <div className="h-80 bg-white border border-[#E8E0DF] rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-72 bg-white border border-[#E8E0DF] rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-8 bg-white border border-[#E8E0DF] rounded-xl text-center">
            <p className="text-sm text-[#8E3F4F] font-medium mb-1">Could not load category</p>
            <p className="text-xs text-[#5C5355]">{error}</p>
          </div>
        )}

        {!loading && !error && !featuredArticle && (
          <div className="p-10 bg-white border border-[#E8E0DF] rounded-xl text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">
              {category.name}
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-3">
              No published articles in this category yet
            </h2>
            <p className="text-sm text-[#5C5355] leading-relaxed mb-6">
              Stories assigned to {category.name} will appear here as soon as they are published from
              the HerMoney Studio Editorial Desk.
            </p>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-[#E8E0DF] text-sm font-medium text-[#1F1B1C] hover:bg-[#F7EAEB] transition-colors"
            >
              Browse All Categories
            </a>
          </div>
        )}

        {!loading && !error && featuredArticle && (
          <div className="space-y-12">
            {/* Featured Article at the Top */}
            <div>
              <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-4">
                Featured Story
              </p>
              <ArticleCard article={featuredArticle} onNavigate={onNavigate} featured />
            </div>

            {/* Additional Articles Grid Underneath */}
            {remainingArticles.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-6 pb-4 border-b border-[#E8E0DF]">
                  More in {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {remainingArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
