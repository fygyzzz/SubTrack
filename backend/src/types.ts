export interface UserPayload {
  id: number;
  email: string;
  name: string;
}

export interface SubscriptionRow {
  id: number;
  user_id: number;
  category_id: number;
  name: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  next_payment_date: string;
  review_flag: boolean;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_icon?: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  icon: string;
}
