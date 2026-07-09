export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  category_id: number | null;
  name: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  next_payment_date: string;
  review_flag: boolean;
  suggested_review?: boolean;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_icon?: string;
}

export interface DashboardData {
  monthlyTotal: number;
  yearlyTotal: number;
  upcomingPayments: {
    id: number;
    name: string;
    amount: number;
    currency: string;
    rub_amount: number;
    next_payment_date: string;
    overdue: boolean;
    category_name?: string;
    category_icon?: string;
  }[];
  categoryBreakdown: Record<string, number>;
  totalSubscriptions: number;
  exchangeRates?: { USD: number; EUR: number };
}
