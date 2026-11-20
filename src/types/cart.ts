import { Product, ProductColor } from '../data/products';

export interface CartItem {
  id: string; // unique item instance id (productId + size + color)
  product: Product;
  selectedSize: string;
  selectedColor: ProductColor;
  quantity: number;
}
