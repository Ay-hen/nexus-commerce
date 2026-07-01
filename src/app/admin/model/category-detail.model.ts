// ─── Shared types for the Category View / Edit modals ─────────────────────
// Reuses the existing `AdminCategory` interface from the Categories
// component instead of redefining it. Adjust the import path below to
// match where these modal files actually live relative to `categories.ts`
// (this assumes: src/app/admin/categories/{categories.ts, category-detail.model.ts}).
import { AdminCategory } from './admin-category.model';

export type ProductStockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface CategoryProduct {
  id: string;
  name: string;
  image: string;
  price: number;      // MAD
  rating: number;      // 0–5
  stock: number;
  status: ProductStockStatus;
}

export interface CategorySeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

export interface CategoryStats {
  productsInCategory: number;
  featuredProducts: number;
  avgRating: number;   // 0–5
  totalSales: number;  // fake for now
  views: number;
}

/**
 * Extended category shape used by the View / Edit modals.
 * `AdminCategory` stays the source of truth for the list/table/grid rows;
 * this just layers on the extra detail fields those rows don't need.
 */
export interface AdminCategoryDetail extends AdminCategory {
  description: string;
  updatedAt: string;   // ISO
  coverImage: string;  // large hero image — falls back to `image`
  gallery: string[];
  seo: CategorySeo;
  stats: CategoryStats;
  products: CategoryProduct[];
}

/**
 * Builds a mock AdminCategoryDetail from a base AdminCategory.
 * Swap this out for a real `CategoryService.getDetail(id)` call once the
 * backend exists — the modals only depend on the shape, not the source.
 */
export function toCategoryDetail(cat: AdminCategory): AdminCategoryDetail {
  const mockProducts: CategoryProduct[] = Array.from({ length: Math.min(6, Math.max(cat.productCount, 0)) }).map((_, i) => ({
    id: `${cat.id}-p${i + 1}`,
    name: `${cat.name} Item ${i + 1}`,
    image: cat.image,
    price: 199 + i * 87.5,
    rating: 3.6 + ((i % 4) * 0.35),
    stock: i === 5 ? 0 : (i % 3 === 0 ? 4 : 32 + i * 6),
    status: i === 5 ? 'out-of-stock' : (i % 3 === 0 ? 'low-stock' : 'in-stock'),
  }));

  return {
    ...cat,
    description: `${cat.name} is one of our core storefront categories, curated for quality and consistency across every listed product. It's actively merchandised and reviewed on a monthly cadence to keep availability and pricing fresh.`,
    updatedAt: cat.createdAt,
    coverImage: cat.image,
    gallery: [cat.image, cat.image, cat.image],
    seo: {
      metaTitle: `${cat.name} | Nexus Store`,
      metaDescription: `Shop the best ${cat.name.toLowerCase()} at Nexus — curated picks, fast shipping, and easy returns.`,
      keywords: [cat.name.toLowerCase(), cat.slug, 'nexus', 'shop online'],
    },
    stats: {
      productsInCategory: cat.productCount,
      featuredProducts: cat.featured ? Math.max(1, Math.round(cat.productCount * 0.12)) : 0,
      avgRating: 4.2,
      totalSales: cat.productCount * 37,
      views: cat.productCount * 812,
    },
    products: mockProducts,
  };
}