import { Product } from '../model/product';

export interface ProductStore {
  getProduct: (id: string) => Promise<Product | undefined>;
  putProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProducts: () => Promise<Product[] | undefined>;
}
