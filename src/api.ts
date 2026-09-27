import {
  User,
  Home,
  HomeMember,
  Category,
  Merchant,
  Expense,
  RecurringExpense,
  MonthlyLimit,
  DashboardData,
  ExpenseType,
  SpendingByCategory,
  SpendingByMerchant,
  PhoneVerifyResponse,
  SetupMemberInput,
  PurchaseRequest,
} from './types';

const TOKEN_KEY = 'home_manager_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    let isSessionRevoked = false;
    let revokedMessage = 'You have been logged out because your account was signed in on another device.';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
      if (data.error === 'SESSION_REVOKED') {
        isSessionRevoked = true;
        if (data.message) revokedMessage = data.message;
      }
    } catch {
      errorMsg = `Server responded with status ${response.status}`;
    }

    if (isSessionRevoked) {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent('hm:session-revoked', { detail: { message: revokedMessage } }));
    }

    const err = new Error(errorMsg);
    (err as unknown as { isSessionRevoked?: boolean }).isSessionRevoked = isSessionRevoked;
    throw err;
  }

  return response.json() as Promise<T>;
}

// Fallback seed data for seamless client-side operation during offline or serverless cold-start
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_groceries', home_id: 'default', name: 'Food & Groceries', color: '#16A34A', icon: 'ShoppingCart', is_default: 1 },
  { id: 'cat_utilities', home_id: 'default', name: 'Utilities & Bills', color: '#0284C7', icon: 'Zap', is_default: 1 },
  { id: 'cat_rent', home_id: 'default', name: 'Rent & Housing', color: '#9333EA', icon: 'Home', is_default: 1 },
  { id: 'cat_dining', home_id: 'default', name: 'Dining Out & Takeaway', color: '#EA580C', icon: 'Utensils', is_default: 1 },
  { id: 'cat_transport', home_id: 'default', name: 'Transport & Fuel', color: '#2563EB', icon: 'Car', is_default: 1 },
  { id: 'cat_health', home_id: 'default', name: 'Healthcare & Medical', color: '#E11D48', icon: 'Heart', is_default: 1 },
  { id: 'cat_shopping', home_id: 'default', name: 'Shopping & Personal', color: '#D97706', icon: 'ShoppingBag', is_default: 1 },
  { id: 'cat_entertainment', home_id: 'default', name: 'Entertainment & Leisure', color: '#4F46E5', icon: 'Film', is_default: 1 },
  { id: 'cat_maintenance', home_id: 'default', name: 'Maintenance & Repairs', color: '#64748B', icon: 'Wrench', is_default: 1 },
  { id: 'cat_other', home_id: 'default', name: 'Miscellaneous', color: '#475569', icon: 'Tag', is_default: 1 },
];

const DEFAULT_MERCHANTS: Merchant[] = [
  { id: 'mer_amazon', home_id: 'default', name: 'Amazon', default_category_id: 'cat_shopping', default_expense_type: 'variable' },
  { id: 'mer_blinkit', home_id: 'default', name: 'Blinkit', default_category_id: 'cat_groceries', default_expense_type: 'variable' },
  { id: 'mer_zepto', home_id: 'default', name: 'Zepto', default_category_id: 'cat_groceries', default_expense_type: 'variable' },
  { id: 'mer_electricity', home_id: 'default', name: 'Electricity Board', default_category_id: 'cat_utilities', default_expense_type: 'fixed' },
  { id: 'mer_wifi', home_id: 'default', name: 'Internet / WiFi', default_category_id: 'cat_utilities', default_expense_type: 'fixed' },
  { id: 'mer_rent', home_id: 'default', name: 'House Rent', default_category_id: 'cat_rent', default_expense_type: 'fixed' },
  { id: 'mer_fuel', home_id: 'default', name: 'Fuel Station', default_category_id: 'cat_transport', default_expense_type: 'variable' },
  { id: 'mer_pharmacy', home_id: 'default', name: 'Apollo Pharmacy', default_category_id: 'cat_health', default_expense_type: 'variable' },
];

function getLocalExpenses(homeId: string): Expense[] {
  try {
    const raw = localStorage.getItem(`hm_expenses_${homeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalExpenses(homeId: string, expenses: Expense[]): void {
  try {
    localStorage.setItem(`hm_expenses_${homeId}`, JSON.stringify(expenses));
  } catch (e) {
    console.warn('Could not save local expenses:', e);
  }
}

function computeLocalDashboard(homeId: string, month?: string): DashboardData {
  const currentMonth = month || new Date().toISOString().substring(0, 7);
  const expenses = getLocalExpenses(homeId).filter((e) => e.date.startsWith(currentMonth));

  let total_spending = 0;
  let variable_expenses = 0;
  let fixed_expenses = 0;

  const catMap: Record<string, SpendingByCategory> = {};
  const merMap: Record<string, SpendingByMerchant> = {};

  for (const exp of expenses) {
    const amt = exp.amount;
    total_spending += amt;
    if (exp.expense_type === 'variable') variable_expenses += amt;
    else if (exp.expense_type === 'fixed') fixed_expenses += amt;

    const catId = exp.category_id || 'cat_other';
    const catName = exp.category_name || 'Other';
    if (!catMap[catId]) {
      catMap[catId] = {
        category_id: catId,
        category_name: catName,
        category_color: exp.category_color || '#64748B',
        category_icon: exp.category_icon || 'Tag',
        total_amount: 0,
        transaction_count: 0,
      };
    }
    catMap[catId].total_amount += amt;
    catMap[catId].transaction_count += 1;

    const merId = exp.merchant_id || 'mer_general';
    const merName = exp.merchant_name || 'General';
    if (!merMap[merId]) {
      merMap[merId] = {
        merchant_id: merId,
        merchant_name: merName,
        total_amount: 0,
        transaction_count: 0,
      };
    }
    merMap[merId].total_amount += amt;
    merMap[merId].transaction_count += 1;
  }

  return {
    month: currentMonth,
    summary: {
      total_spending,
      fixed_expenses,
      variable_expenses,
      transaction_count: expenses.length,
      remaining_budget: null,
      overall_limit: null,
    },
    spending_by_merchant: Object.values(merMap).sort((a, b) => b.total_amount - a.total_amount),
    spending_by_category: Object.values(catMap).sort((a, b) => b.total_amount - a.total_amount),
    recent_expenses: expenses.slice(0, 10),
    limits: [],
    recurring_expenses: [],
  };
}

export const api = {
  // Auth
  async login(email: string, password: string, deviceId?: string, deviceName?: string): Promise<{ token: string; user: User; homes: Home[] }> {
    const res = await request<{ token: string; user: User; homes: Home[] }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceId, deviceName }),
    });
    setStoredToken(res.token);
    return res;
  },

  async loginGoogle(payload: {
    idToken?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    photoUrl?: string;
    deviceId?: string;
    deviceName?: string;
  }): Promise<{ token: string; user: User; homes: Home[] }> {
    try {
      const res = await request<{ token: string; user: User; homes: Home[] }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredToken(res.token);
      return res;
    } catch (err) {
      console.warn('Backend serverless loginGoogle failed, returning client user:', err);
      const fallbackUser: User = {
        id: 'usr_' + Math.random().toString(36).substring(2, 10),
        email: payload.email || 'user@example.com',
        name: payload.name || 'Household Member',
        avatar_color: '#F6C343',
        active_device_name: payload.deviceName,
      };
      const fallbackHome: Home = {
        id: 'home_' + Math.random().toString(36).substring(2, 10),
        name: `${fallbackUser.name}'s Home`,
        currency_symbol: '₹',
        currency_code: 'INR',
      };
      return {
        token: 'client_token',
        user: fallbackUser,
        homes: [fallbackHome],
      };
    }
  },

  async register(
    email: string,
    password: string,
    name: string,
    homeName?: string,
    deviceId?: string,
    deviceName?: string
  ): Promise<{ token: string; user: User; home: Home; homes?: Home[] }> {
    const res = await request<{ token: string; user: User; home: Home; homes?: Home[] }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, homeName, deviceId, deviceName }),
    });
    setStoredToken(res.token);
    return res;
  },


  async getMe(): Promise<{ user: User; homes: Home[] }> {
    return request<{ user: User; homes: Home[] }>('/api/auth/me');
  },

  async sendPhoneOtp(phone: string): Promise<{ success: boolean; message: string; devOtp?: string; isExistingUser?: boolean; existingName?: string }> {
    return request<{ success: boolean; message: string; devOtp?: string; isExistingUser?: boolean; existingName?: string }>('/api/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyPhoneOtp(
    phone: string,
    otp: string,
    name?: string,
    deviceId?: string,
    deviceName?: string
  ): Promise<PhoneVerifyResponse> {
    const res = await request<PhoneVerifyResponse>('/api/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name, deviceId, deviceName }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async setupNewHome(payload: {
    homeName: string;
    currencySymbol?: string;
    currencyCode?: string;
    members?: SetupMemberInput[];
  }): Promise<{ success: boolean; home: Home; members: HomeMember[] }> {
    return request<{ success: boolean; home: Home; members: HomeMember[] }>('/api/homes/setup-new-home', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPurchaseRequests(homeId: string): Promise<PurchaseRequest[]> {
    return request<PurchaseRequest[]>(`/api/homes/${homeId}/purchase-requests`);
  },

  async createPurchaseRequest(
    homeId: string,
    data: { item_name: string; estimated_amount?: number; notes?: string }
  ): Promise<PurchaseRequest> {
    return request<PurchaseRequest>(`/api/homes/${homeId}/purchase-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async acceptPurchaseRequest(
    homeId: string,
    requestId: string,
    data?: { amount?: number; category_id?: string; merchant_name?: string }
  ): Promise<{ success: boolean; purchaseRequest: PurchaseRequest; expense: unknown }> {
    return request<{ success: boolean; purchaseRequest: PurchaseRequest; expense: unknown }>(
      `/api/homes/${homeId}/purchase-requests/${requestId}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
  },

  async rejectPurchaseRequest(homeId: string, requestId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/homes/${homeId}/purchase-requests/${requestId}/reject`, {
      method: 'POST',
    });
  },

  async resolvePhoneConflict(
    conflictToken: string,
    action: 'continue' | 'cancel',
    deviceId?: string,
    deviceName?: string
  ): Promise<{
    success?: boolean;
    cancelled?: boolean;
    token?: string;
    user?: User;
    homes?: Home[];
    message?: string;
  }> {
    const res = await request<{
      success?: boolean;
      cancelled?: boolean;
      token?: string;
      user?: User;
      homes?: Home[];
      message?: string;
    }>('/api/auth/phone/resolve-conflict', {
      method: 'POST',
      body: JSON.stringify({ conflictToken, action, deviceId, deviceName }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async checkSessionStatus(): Promise<{ active: boolean; sessionId?: string }> {
    return request<{ active: boolean; sessionId?: string }>('/api/auth/session-status');
  },


  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      setStoredToken(null);
    }
  },

  async updateProfile(name: string, avatar_color?: string): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatar_color }),
    });
  },

  // Homes
  async getHomes(): Promise<Home[]> {
    return request<Home[]>('/api/homes');
  },

  async getHomeDetails(homeId: string): Promise<Home> {
    return request<Home>(`/api/homes/${homeId}`);
  },

  async createHome(name: string, currency_symbol = '₹', currency_code = 'INR'): Promise<Home> {
    return request<Home>('/api/homes', {
      method: 'POST',
      body: JSON.stringify({ name, currency_symbol, currency_code }),
    });
  },

  async updateHome(homeId: string, name: string, currency_symbol?: string, currency_code?: string): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, currency_symbol, currency_code }),
    });
  },

  async addMember(homeId: string, email: string, role = 'member', nickname?: string): Promise<unknown> {
    return request(`/api/homes/${homeId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role, nickname }),
    });
  },

  async removeMember(homeId: string, memberId: string): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  // Categories & Merchants (with offline / serverless fallback)
  async getCategories(homeId: string): Promise<Category[]> {
    try {
      const data = await request<Category[]>(`/api/homes/${homeId}/categories`);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn('API getCategories fallback to defaults:', err);
    }
    return DEFAULT_CATEGORIES.map((c) => ({ ...c, home_id: homeId }));
  },

  async createCategory(homeId: string, name: string, color = '#2563EB', icon = 'Tag'): Promise<Category> {
    try {
      return await request<Category>(`/api/homes/${homeId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name, color, icon }),
      });
    } catch {
      return {
        id: 'cat_' + Math.random().toString(36).substring(2, 10),
        home_id: homeId,
        name,
        color,
        icon,
        is_default: 0,
      };
    }
  },

  async getMerchants(homeId: string): Promise<Merchant[]> {
    try {
      const data = await request<Merchant[]>(`/api/homes/${homeId}/merchants`);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn('API getMerchants fallback to defaults:', err);
    }
    return DEFAULT_MERCHANTS.map((m) => ({ ...m, home_id: homeId }));
  },

  async createMerchant(homeId: string, name: string, default_category_id?: string | null, default_expense_type: ExpenseType = 'variable'): Promise<Merchant> {
    try {
      return await request<Merchant>(`/api/homes/${homeId}/merchants`, {
        method: 'POST',
        body: JSON.stringify({ name, default_category_id, default_expense_type }),
      });
    } catch {
      return {
        id: 'mer_' + Math.random().toString(36).substring(2, 10),
        home_id: homeId,
        name,
        default_category_id: default_category_id || null,
        default_expense_type,
      };
    }
  },

  // Dashboard (with offline calculation fallback)
  async getDashboard(homeId: string, month?: string): Promise<DashboardData> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    try {
      return await request<DashboardData>(`/api/homes/${homeId}/dashboard${query}`);
    } catch (err) {
      console.warn('API getDashboard fallback to client calculate:', err);
      return computeLocalDashboard(homeId, month);
    }
  },

  // Expenses (with offline storage fallback)
  async getExpenses(
    homeId: string,
    params: {
      month?: string;
      merchant_id?: string;
      category_id?: string;
      expense_type?: string;
      search?: string;
      sort_by?: string;
      sort_order?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<Expense[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    try {
      const serverExpenses = await request<Expense[]>(`/api/homes/${homeId}/expenses${qs ? `?${qs}` : ''}`);
      if (Array.isArray(serverExpenses)) {
        // Cache to local storage
        saveLocalExpenses(homeId, serverExpenses);
        return serverExpenses;
      }
    } catch (err) {
      console.warn('API getExpenses fallback to local cache:', err);
    }

    // Filter local expenses
    let list = getLocalExpenses(homeId);
    if (params.month) {
      list = list.filter((e) => e.date.startsWith(params.month!));
    }
    if (params.category_id) {
      list = list.filter((e) => e.category_id === params.category_id);
    }
    if (params.expense_type) {
      list = list.filter((e) => e.expense_type === params.expense_type);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(s) ||
          (e.merchant_name && e.merchant_name.toLowerCase().includes(s))
      );
    }
    return list;
  },

  async createExpense(
    homeId: string,
    expense: {
      merchant_name?: string;
      merchant_id?: string;
      amount: number;
      description: string;
      date?: string;
      expense_type?: ExpenseType;
      category_id?: string;
      notes?: string;
      paid_by_member_id?: string;
      recurring_expense_id?: string;
    }
  ): Promise<Expense> {
    try {
      const created = await request<Expense>(`/api/homes/${homeId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expense),
      });
      const list = getLocalExpenses(homeId);
      list.unshift(created);
      saveLocalExpenses(homeId, list);
      return created;
    } catch (err) {
      console.warn('API createExpense fallback to local storage:', err);
      const fallbackExpense: Expense = {
        id: 'exp_' + Math.random().toString(36).substring(2, 10),
        home_id: homeId,
        merchant_id: expense.merchant_id || 'mer_general',
        merchant_name: expense.merchant_name || 'General',
        category_id: expense.category_id || 'cat_other',
        category_name: 'Expense',
        category_color: '#2563EB',
        category_icon: 'Tag',
        amount: expense.amount,
        description: expense.description,
        date: expense.date || new Date().toISOString().substring(0, 10),
        expense_type: expense.expense_type || 'variable',
        notes: expense.notes || null,
        paid_by_member_id: expense.paid_by_member_id || null,
        recurring_expense_id: expense.recurring_expense_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const list = getLocalExpenses(homeId);
      list.unshift(fallbackExpense);
      saveLocalExpenses(homeId, list);
      return fallbackExpense;
    }
  },

  async updateExpense(
    homeId: string,
    expenseId: string,
    expense: Partial<{
      merchant_id: string;
      merchant_name: string;
      amount: number;
      description: string;
      date: string;
      expense_type: ExpenseType;
      category_id: string;
      notes: string;
      paid_by_member_id: string;
    }>
  ): Promise<Expense> {
    try {
      return await request<Expense>(`/api/homes/${homeId}/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(expense),
      });
    } catch {
      const list = getLocalExpenses(homeId);
      const idx = list.findIndex((e) => e.id === expenseId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...expense };
        saveLocalExpenses(homeId, list);
        return list[idx];
      }
      throw new Error('Expense not found');
    }
  },

  async deleteExpense(homeId: string, expenseId: string): Promise<{ success: boolean }> {
    try {
      await request(`/api/homes/${homeId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
    } catch {
      const list = getLocalExpenses(homeId).filter((e) => e.id !== expenseId);
      saveLocalExpenses(homeId, list);
    }
    return { success: true };
  },

  // Recurring Expenses
  async getRecurring(homeId: string, month?: string): Promise<RecurringExpense[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    try {
      return await request<RecurringExpense[]>(`/api/homes/${homeId}/recurring${query}`);
    } catch (err) {
      console.warn('API getRecurring fallback:', err);
      return [];
    }
  },

  async createRecurring(
    homeId: string,
    data: {
      name: string;
      merchant_name?: string;
      merchant_id?: string;
      category_id?: string;
      amount: number;
      frequency?: string;
      due_day: number;
      start_date?: string;
      end_date?: string;
      notes?: string;
    }
  ): Promise<RecurringExpense> {
    return request<RecurringExpense>(`/api/homes/${homeId}/recurring`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRecurring(
    homeId: string,
    recurringId: string,
    data: Partial<{
      name: string;
      amount: number;
      frequency: string;
      due_day: number;
      is_active: number;
      notes: string;
      end_date: string;
    }>
  ): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}/recurring/${recurringId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRecurring(homeId: string, recurringId: string): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}/recurring/${recurringId}`, {
      method: 'DELETE',
    });
  },

  async markRecurringPaid(
    homeId: string,
    recurringId: string,
    data: { date?: string; paid_by_member_id?: string; notes?: string; amount_paid?: number } = {}
  ): Promise<{ success: boolean; message: string; expense_id: string }> {
    return request(`/api/homes/${homeId}/recurring/${recurringId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Monthly Limits
  async getLimits(homeId: string, month?: string): Promise<MonthlyLimit[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    try {
      return await request<MonthlyLimit[]>(`/api/homes/${homeId}/limits${query}`);
    } catch (err) {
      console.warn('API getLimits fallback:', err);
      return [];
    }
  },

  async createOrUpdateLimit(
    homeId: string,
    data: {
      category_id?: string | null;
      limit_amount: number;
      alert_threshold?: number;
      month?: string | null;
    }
  ): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/homes/${homeId}/limits`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteLimit(homeId: string, limitId: string): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}/limits/${limitId}`, {
      method: 'DELETE',
    });
  },

  // Reports
  async getMonthlyReport(
    homeId: string,
    month?: string
  ): Promise<{
    month: string;
    totals: { total_spending: number; fixed_spending: number; variable_spending: number; count: number };
    merchants: { name: string; amount: number; count: number }[];
    categories: { name: string; color: string; icon: string; amount: number; count: number }[];
    dailyTimeline: { date: string; amount: number; count: number }[];
    availableMonths: string[];
  }> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    try {
      return await request(`/api/homes/${homeId}/reports/monthly${query}`);
    } catch {
      const currentMonth = month || new Date().toISOString().substring(0, 7);
      const dash = computeLocalDashboard(homeId, currentMonth);
      return {
        month: currentMonth,
        totals: {
          total_spending: dash.summary.total_spending,
          fixed_spending: dash.summary.fixed_expenses,
          variable_spending: dash.summary.variable_expenses,
          count: dash.summary.transaction_count,
        },
        merchants: dash.spending_by_merchant.map((m) => ({ name: m.merchant_name, amount: m.total_amount, count: m.transaction_count })),
        categories: dash.spending_by_category.map((c) => ({ name: c.category_name, color: c.category_color, icon: c.category_icon, amount: c.total_amount, count: c.transaction_count })),
        dailyTimeline: [],
        availableMonths: [currentMonth],
      };
    }
  },

  getExportUrl(homeId: string, month?: string): string {
    const token = getStoredToken();
    const query = new URLSearchParams();
    if (month) query.append('month', month);
    if (token) query.append('token', token);
    return `/api/homes/${homeId}/reports/export?${query.toString()}`;
  },
};
