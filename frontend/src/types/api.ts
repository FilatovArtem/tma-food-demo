export interface Category {
  id: number;
  name: string;
  slug: string;
  order: number;
}

export interface Dish {
  id: number;
  category_id: number;
  name: string;
  description: string;
  composition: string | null;
  calories: number | null;
  price: number;
  photo_url: string;
  is_available: boolean;
}

export interface OrderItemIn {
  dish_id: number;
  qty: number;
}

export interface OrderCreate {
  items: OrderItemIn[];
  name: string;
  phone: string;
  comment?: string | null;
}

export interface OrderItemOut {
  dish_id: number;
  dish_name: string;
  unit_price: number;
  qty: number;
}

export interface Order {
  id: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItemOut[];
}

export interface AIRecommendIn {
  query: string;
}

export interface AIRecommendItem {
  dish_id: number;
  reason: string;
}

export interface AIRecommendOut {
  recommendations: AIRecommendItem[];
}

export interface ApiErrorBody {
  detail: string;
}
