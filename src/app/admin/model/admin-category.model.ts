export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  status: 'active' | 'inactive';
  featured: boolean;
  createdAt: string;
}