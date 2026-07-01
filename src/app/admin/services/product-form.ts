// product-form.service.ts
import { Service } from '@angular/core';
import { Injectable, signal } from '@angular/core';
import {
  ProductImage,
  ColorVariant,
  ProductFormPayload,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../model/product-image.model';

@Service()
export class ProductFormService {

  // ─── Base64 conversion ───────────────────────────────────────────────────
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  // ─── Image validation ────────────────────────────────────────────────────
  validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" must be JPEG, PNG, or WebP.`;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `"${file.name}" exceeds the 5 MB limit.`;
    }
    return null;
  }

  buildProductImage(file: File, base64: string): ProductImage {
    return {
      id:       crypto.randomUUID(),
      file,
      base64,
      preview:  base64,
      name:     file.name,
      size:     file.size,
      mimeType: file.type,
    };
  }

  // ─── Slug generation ─────────────────────────────────────────────────────
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // ─── Discount calculation ────────────────────────────────────────────────
  computeDiscount(price: number | null, originalPrice: number | null): number {
    if (!price || !originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  // ─── Format bytes ────────────────────────────────────────────────────────
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(0) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ─── Build a stub ProductImage from an existing Base64 string ────────────
  // Used when loading a product from the backend that already has Base64 images
  imageFromBase64(base64: string, filename = 'image.jpg'): ProductImage {
    const mimeMatch = base64.match(/^data:([^;]+);/);
    const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return {
      id:       crypto.randomUUID(),
      base64,
      preview:  base64,
      name:     filename,
      size:     0,  // unknown for pre-existing images
      mimeType,
    };
  }

  // ─── Validate full form ──────────────────────────────────────────────────
  validate(
    form: {
      name: string; brand: string; category: string;
      description: string; price: number | null; stock: number | null;
      sku: string; discount: number | null;
    },
    hasColorVariants: boolean,
    defaultImages: ProductImage[],
    colorVariants: ColorVariant[],
  ): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!form.name.trim())        errs['name']        = 'Product name is required.';
    if (!form.brand.trim())       errs['brand']       = 'Brand is required.';
    if (!form.category)           errs['category']    = 'Category is required.';
    if (!form.description.trim()) errs['description'] = 'Description is required.';
    if (!form.price || form.price <= 0)
                                  errs['price']       = 'Price must be greater than 0.';
    if (form.stock === null || form.stock < 0)
                                  errs['stock']       = 'Stock quantity is required.';
    if (!form.sku.trim())         errs['sku']         = 'SKU is required.';

    if (form.discount !== null && (form.discount < 0 || form.discount > 100)) {
      errs['discount'] = 'Discount must be between 0 and 100.';
    }

    if (!hasColorVariants) {
      if (defaultImages.length === 0) {
        errs['images'] = 'At least one product image is required.';
      }
    } else {
      if (colorVariants.length === 0) {
        errs['colorVariants'] = 'Add at least one color variant.';
      } else {
        const emptyNames = colorVariants.filter(v => !v.colorName.trim());
        if (emptyNames.length) {
          errs['colorVariants'] = 'All color variants must have a name.';
        } else {
          const names = colorVariants.map(v => v.colorName.trim().toLowerCase());
          if (new Set(names).size !== names.length) {
            errs['colorVariants'] = 'Color variant names must be unique.';
          }
        }
        const emptyImages = colorVariants.filter(v => v.images.length === 0);
        if (emptyImages.length && !errs['colorVariants']) {
          errs['colorVariants'] = 'All color variants must have at least one image.';
        }
      }
    }

    return errs;
  }
}