import { CATEGORY_NAMES, CategoryName } from '../types';
export { CATEGORY_NAMES };

export interface CategoryMeta {
  name: CategoryName;
  slug: string;
  description: string;
  shortLabel: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    name: 'Make Money Online',
    slug: 'make-money-online',
    shortLabel: 'Make Money Online',
    description:
      'Practical frameworks, digital revenue models, and vetted online income pathways designed for sustainable financial growth.',
  },
  {
    name: 'Work From Home',
    slug: 'work-from-home',
    shortLabel: 'Work From Home',
    description:
      'Remote career strategies, flexible employment guides, and home-office systems that balance ambition with everyday life.',
  },
  {
    name: 'Freelancing',
    slug: 'freelancing',
    shortLabel: 'Freelancing',
    description:
      'Client acquisition, rate positioning, contracts, and independent consulting blueprints for modern creative and analytical talent.',
  },
  {
    name: 'Small Business Ideas',
    slug: 'small-business-ideas',
    shortLabel: 'Small Business Ideas',
    description:
      'Lean startup concepts, boutique service ventures, and financial planning for founders launching profitable independent businesses.',
  },
  {
    name: 'Passive Income',
    slug: 'passive-income',
    shortLabel: 'Passive Income',
    description:
      'Digital products, evergreen licensing, dividend fundamentals, and scalable systems built to compound over time.',
  },
  {
    name: 'Blogging & Pinterest',
    slug: 'blogging-and-pinterest',
    shortLabel: 'Blogging & Pinterest',
    description:
      'Editorial content strategy, Pinterest traffic architecture, search optimization, and long-form publishing monetization.',
  },
] as const;

export const INITIAL_ARTICLE_SLOT_COUNT = 10;

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByName(name: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.name === name);
}
