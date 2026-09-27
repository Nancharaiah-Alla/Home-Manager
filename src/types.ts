export type ExpenseType = 'fixed' | 'variable';
export type MemberRole = 'admin' | 'editor' | 'viewer' | 'member';
export type RecurringFrequency = 'monthly' | 'weekly' | 'quarterly' | 'yearly';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  avatar_color: string;
  active_device_name?: string;
}

export interface PhoneVerifyResponse {
  success?: boolean;
  conflict?: boolean;
  conflictToken?: string;
  currentDevice?: string;
  message?: string;
  token?: string;
  user?: User;
  homes?: Home[];
  isNewUser?: boolean;
}

export interface SetupMemberInput {
  name: string;
  phone?: string;
  email?: string;
  role: 'editor' | 'viewer';
}

export interface PurchaseRequest {
  id: string;
  home_id: string;
  item_name: string;
  estimated_amount?: number | null;
  notes?: string | null;
  requested_by_member_id: string;
  requested_by_name?: string;
  requested_by_nickname?: string;
  requester_role?: string;
  status: 'pending' | 'accepted' | 'rejected';
  accepted_by_name?: string | null;
  expense_id?: string | null;
  created_at: string;
  updated_at: string;
}


export interface Home {
  id: string;
  name: string;
  currency_symbol: string;
  currency_code: string;
  created_by_user_id?: string;
  role?: MemberRole;
  nickname?: string;
  member_count?: number;
  members?: HomeMember[];
}

export interface HomeMember {
  id: string;
  home_id: string;
  user_id: string;
  role: MemberRole;
  nickname: string;
  color: string;
  joined_at: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface Category {
  id: string;
  home_id: string;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  expense_count?: number;
  total_spent?: number;
}

export interface Merchant {
  id: string;
  home_id: string;
  name: string;
  default_category_id: string | null;
  default_expense_type: ExpenseType;
  category_name?: string;
  category_color?: string;
  transaction_count?: number;
  total_spent?: number;
}

export interface Expense {
  id: string;
  home_id: string;
  merchant_id: string;
  category_id: string;
  amount: number;
  description: string;
  expense_type: ExpenseType;
  date: string;
  paid_by_member_id: string | null;
  recurring_expense_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  merchant_name: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  paid_by_nickname?: string;
  paid_by_name?: string;
}

export interface RecurringExpense {
  id: string;
  home_id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  due_day: number;
  start_date: string;
  end_date: string | null;
  is_active: number;
  notes: string | null;
  merchant_name: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  is_paid?: boolean;
  paid_expense_id?: string | null;
  paid_date?: string | null;
  paid_amount?: number | null;
}

export interface MonthlyLimit {
  id: string;
  home_id: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon?: string | null;
  limit_amount: number;
  month: string | null;
  alert_threshold: number;
  spent: number;
  remaining: number;
  exceeded: number;
  percentage: number;
  is_warning: boolean;
  is_exceeded: boolean;
}

export interface DashboardSummary {
  total_spending: number;
  fixed_expenses: number;
  variable_expenses: number;
  transaction_count: number;
  remaining_budget: number | null;
  overall_limit: number | null;
}

export interface SpendingByMerchant {
  merchant_id: string;
  merchant_name: string;
  total_amount: number;
  transaction_count: number;
}

export interface SpendingByCategory {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total_amount: number;
  transaction_count: number;
}

export interface DashboardData {
  month: string;
  summary: DashboardSummary;
  spending_by_merchant: SpendingByMerchant[];
  spending_by_category: SpendingByCategory[];
  recent_expenses: Expense[];
  limits: MonthlyLimit[];
  recurring_expenses: RecurringExpense[];
}
