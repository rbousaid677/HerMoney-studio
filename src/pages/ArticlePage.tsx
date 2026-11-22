import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ListOrdered } from 'lucide-react';
import { getCategoryByName } from '../constants/categories';
import { getPublishedArticleBySlug } from '../services/articleService';
import { Article } from '../types';
import { calculateReadingTime, extractTableOfContents } from '../utils/htmlUtils';
import { applySeoMetadata, buildArticleSchema, getCanonicalBaseUrl } from '../utils/seo';
import { AdSenseSlot } from '../components/AdSenseSlot';
import { ArticleShareBar } from '../components/ArticleShareBar';
import { SafeImage } from '../components/SafeImage';

interface ArticlePageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ArticlePage({ slug, onNavigate }: ArticlePageProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const found = await getPublishedArticleBySlug(slug);
        if (active) setArticle(found);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load article.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    const baseUrl = getCanonicalBaseUrl();
    const articleUrl = article.canonicalUrl.trim() || `${baseUrl}/article/${article.slug}`;
    applySeoMetadata({
      title: article.seoTitle || `${article.title} | HerMoney Studio`,
      description: article.metaDescription || article.excerpt,
      canonicalPath: `/article/${article.slug}`,
      canonicalOverride: article.canonicalUrl.trim() || undefined,
      ogType: 'article',
      ogImage: article.coverImage || undefined,
      schemaJson: buildArticleSchema(article, articleUrl),
    });
  }, [article]);

  const { processedHtml, tocItems } = useMemo(() => {
    if (!article?.content) return { processedHtml: '', tocItems: [] };
    return extractTableOfContents(article.content);
  }, [article?.content]);

  const readingMetrics = useMemo(() => {
    return calculateReadingTime(article?.content || '');
  }, [article?.content]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 animate-pulse space-y-6">
        <div className="h-4 w-40 bg-[#F6F0EA] rounded" />
        <div className="h-12 w-full bg-[#F6F0EA] rounded" />
        <div className="aspect-[16/9] bg-[#F6F0EA] rounded-xl" />
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-[#F6F0EA] rounded" />
          <div className="h-4 w-5/6 bg-[#F6F0EA] rounded" />
          <div className="h-4 w-4/5 bg-[#F6F0EA] rounded" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-2">
          HerMoney Studio
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C] mb-4">
          {error ? 'Unable to load article' : 'Article not found'}
        </h1>
        <p className="text-sm text-[#5C5355] leading-relaxed mb-8">
          {error ||
            'This article may have been moved, unpublished, or is currently saved as a draft.'}
        </p>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F]"
        >
          Return to Magazine
        </a>
      </div>
    );
  }

  const categoryMeta = getCategoryByName(article.category);
  const canonicalArticleUrl =
    article.canonicalUrl.trim() || `${getCanonicalBaseUrl()}/article/${article.slug}`;
  const articleShareDescription = article.metaDescription || article.excerpt || '';

  function scrollToHeading(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <article className="bg-[#FCF9F6]">
      {/* Clean Magazine Header — No Sidebar */}
      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E3F4F] font-medium mb-4">
          {categoryMeta ? (
            <a
              href={`/category/${categoryMeta.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/category/${categoryMeta.slug}`);
              }}
              className="hover:underline underline-offset-4"
            >
              {article.category}
            </a>
          ) : (
            <span>{article.category}</span>
          )}
          <span aria-hidden="true" className="text-[#C59B43]">·</span>
          <span className="text-[#5C5355] font-normal tabular-nums">
            {readingMetrics.minutes} min read
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1F1B1C] leading-[1.16] tracking-tight mb-5 text-wrap-balance">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-base sm:text-lg text-[#5C5355] leading-relaxed mb-6">
            {article.excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-[#E8E0DF] text-sm text-[#5C5355]">
          <span>
            By <strong className="font-medium text-[#1F1B1C]">{article.author}</strong>
          </span>
          <span aria-hidden="true" className="text-[#C59B43]">·</span>
          <time dateTime={article.publicationDate}>
            Published {formatDate(article.publicationDate)}
          </time>
        </div>

        <ArticleShareBar
          variant="top"
          title={article.title}
          description={articleShareDescription}
          url={canonicalArticleUrl}
        />
      </header>

      {/* Prominent Cover Image */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-10">
        <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#E8E0DF] bg-white">
          <SafeImage
            src={article.coverImage}
            alt={article.title}
            fallbackTitle={article.title}
            priority
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Main Single-Column Reading Body (No Sidebar) */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {/* Clickable Table of Contents generated from H2/H3 headings */}
        {tocItems.length > 0 && (
          <nav
            aria-label="Table of contents"
            className="mb-10 p-6 bg-white border border-[#E8E0DF] rounded-xl"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8E3F4F] font-semibold mb-3.5">
              <ListOrdered className="w-4 h-4 text-[#C59B43]" />
              <span>Table of Contents</span>
            </div>
            <ol className="space-y-2 text-sm">
              {tocItems.map((item) => (
                <li key={item.id} className={item.level === 3 ? 'pl-5' : ''}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToHeading(item.id);
                    }}
                    className="text-[#1F1B1C] hover:text-[#8E3F4F] hover:underline underline-offset-4 transition-colors"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Sanitized Editorial Article Prose */}
        <div
          className="editorial-prose"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />

        {/* Configurable In-Article AdSense Slot */}
        <AdSenseSlot placement="inArticle" />

        {/* End-of-Article Sharing Section */}
        <ArticleShareBar
          variant="bottom"
          title={article.title}
          description={articleShareDescription}
          url={canonicalArticleUrl}
        />

        {/* Unboxed Tags & Category Return Navigation */}
        <footer className="mt-12 pt-8 border-t border-[#E8E0DF] space-y-6">
          {article.tags.length > 0 && (
            <div className="text-xs text-[#5C5355] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="uppercase tracking-widest text-[#8E3F4F] font-medium mr-1">
                Topics:
              </span>
              {article.tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="inline-flex items-center gap-2">
                  <span>{tag}</span>
                  {index < article.tags.length - 1 && (
                    <span aria-hidden="true" className="text-[#C59B43]">·</span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <a
              href={categoryMeta ? `/category/${categoryMeta.slug}` : '/'}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(categoryMeta ? `/category/${categoryMeta.slug}` : '/');
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#8E3F4F] hover:text-[#6B2A38] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {categoryMeta ? `Back to ${categoryMeta.name}` : 'Back to Magazine'}
              </span>
            </a>
          </div>
        </footer>
      </div>
    </article>
  );
}
