export type CategoryId = "cameras" | "lenses" | "lighting" | "tripods" | "accessories";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: CategoryId;
  condition: "new" | "used";
  conditionLabel: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: string[];
  mount?: string;
  tagline: string;
  description: string;
  conditionNotes: string;
  tested: string;
  defects: string;
  included: string[];
  warranty: string;
  specs: Record<string, string>;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
  badge?: string;
}

export type OrderStatus =
  | "awaiting_payment"
  | "slip_submitted"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  recipient: string;
  phone: string;
  address: string;
  note: string;
  createdAt: string;
  expiresAt: string;
  shippingCompany?: string;
  trackingNumber?: string;
  isDemo?: boolean;
  slipUrl?: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
}
export interface StoreSettings {
  paymentQrUrl?: string | null;
  paymentAccount?: string | null;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  privacyPolicy?: string | null;
  warrantyPolicy?: string | null;
}
