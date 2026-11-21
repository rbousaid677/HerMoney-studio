import { Article } from '../types';
import { SafeImage } from './SafeImage';

interface ArticleCardProps {
  article: Article;
  onNavigate: (path: string) => void;
  featured?: boolean;
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

export function ArticleCard({ article, onNavigate, featured = false }: ArticleCardProps) {
  const articlePath = `/article/${article.slug}`;

  if (featured) {
    return (
      <article className="group bg-white border border-[#E8E0DF] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <a
          href={articlePath}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(articlePath);
          }}
          className="lg:col-span-7 block aspect-[16/10] lg:aspect-auto lg:min-h-[360px] overflow-hidden bg-[#F6F0EA]"
        >
          <SafeImage
            src={article.coverImage}
            alt={article.title}
            fallbackTitle={article.title}
            priority
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </a>
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E3F4F] font-medium mb-3">
            <span>{article.category}</span>
            <span aria-hidden="true" className="text-[#C59B43]">·</span>
            <time dateTime={article.publicationDate} className="text-[#5C5355] font-normal">
              {formatDate(article.publicationDate)}
            </time>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1F1B1C] leading-snug mb-3 text-wrap-balance">
            <a
              href={articlePath}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(articlePath);
              }}
              className="hover:text-[#8E3F4F] transition-colors"
            >
              {article.title}
            </a>
          </h2>
          {article.excerpt && (
            <p className="text-sm sm:text-base text-[#5C5355] leading-relaxed mb-5 line-clamp-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E0DF] text-xs text-[#5C5355]">
            <span>By {article.author}</span>
            <a
              href={articlePath}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(articlePath);
              }}
              className="font-medium text-[#8E3F4F] hover:text-[#6B2A38] transition-colors"
            >
              Read Feature
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white border border-[#E8E0DF] rounded-xl overflow-hidden flex flex-col h-full">
      <a
        href={articlePath}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(articlePath);
        }}
        className="block aspect-[4/3] overflow-hidden bg-[#F6F0EA]"
      >
        <SafeImage
          src={article.coverImage}
          alt={article.title}
          fallbackTitle={article.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </a>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E3F4F] font-medium mb-2.5">
          <span>{article.category}</span>
          <span aria-hidden="true" className="text-[#C59B43]">·</span>
          <time dateTime={article.publicationDate} className="text-[#5C5355] font-normal">
            {formatDate(article.publicationDate)}
          </time>
        </div>
        <h3 className="font-serif text-xl font-semibold text-[#1F1B1C] leading-snug mb-2.5 text-wrap-balance">
          <a
            href={articlePath}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(articlePath);
            }}
            className="hover:text-[#8E3F4F] transition-colors"
          >
            {article.title}
          </a>
        </h3>
        {article.excerpt && (
          <p className="text-sm text-[#5C5355] leading-relaxed mb-4 line-clamp-3 flex-1">
            {article.excerpt}
          </p>
        )}
        <div className="pt-3.5 border-t border-[#E8E0DF] flex items-center justify-between text-xs text-[#5C5355] mt-auto">
          <span>By {article.author}</span>
          <a
            href={articlePath}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(articlePath);
            }}
            className="font-medium text-[#8E3F4F] hover:text-[#6B2A38] transition-colors"
          >
            Read Article
          </a>
        </div>
      </div>
    </article>
  );
}
