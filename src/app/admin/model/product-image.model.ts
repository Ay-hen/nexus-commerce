// product-image.model.ts
// ─────────────────────────────────────────────────────────────────────────────
// Images are stored as Base64 strings in MongoDB.
// Spring Boot endpoint:  POST /api/admin/products  (receives ProductPayload)
// The frontend converts File → Base64 before sending.

export interface ProductImage {
  id: string;           // local UUID, not persisted
  file?: File;          // original File object (for preview before upload)
  base64: string;       // data:image/...;base64,... — what gets sent to backend
  preview: string;      // same as base64 for display; kept separate for clarity
  name: string;         // original filename
  size: number;         // bytes
  mimeType: string;     // 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ColorVariant {
  id: string;           // local UUID
  colorName: string;    // e.g. "Midnight Black"
  colorHex: string;     // e.g. "#1a1a1a" — for swatch preview
  images: ProductImage[]; // max 3 per variant
}

// ─── Full product payload sent to Spring Boot ─────────────────────────────────
// Replace mock service with:
// this.http.post<{ id: number }>('/api/admin/products', payload, { headers: authHeaders })
export interface ProductFormPayload {
  // Basic info
  name: string;
  brand: string;
  category: string;
  description: string;
  specifications: string;
  tags: string[];

  // Pricing & inventory
  price: number;
  originalPrice: number;
  discount: number;
  stock: number;
  sku: string;
  barcode: string;
  weight: number;         // grams
  dimensions: { length: number; width: number; height: number };
  warranty: string;

  // Images
  hasColorVariants: boolean;
  defaultImages: ProductImage[];    // used when hasColorVariants = false
  colorVariants: ColorVariant[];    // used when hasColorVariants = true

  // Flags
  status: 'active' | 'draft';
  featured: boolean;
  isNew: boolean;
  badge: 'new' | 'sale' | null;

  // SEO
  seoTitle: string;
  seoDescription: string;
  slug: string;
}

// ─── Validation result ────────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ─── Allowed image types ──────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_SLOT  = 3;