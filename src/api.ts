import {
  User,
  Home,
  Category,
  Merchant,
  Expense,
  RecurringExpense,
  MonthlyLimit,
  DashboardData,
  ExpenseType,
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
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = `Server responded with status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; homes: Home[] }> {
    const res = await request<{ token: string; user: User; homes: Home[] }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async loginGoogle(payload: { idToken?: string; accessToken?: string; email?: string; name?: string; photoUrl?: string }): Promise<{ token: string; user: User; homes: Home[] }> {
    const res = await request<{ token: string; user: User; homes: Home[] }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async register(email: string, password: string, name: string, homeName?: string): Promise<{ token: string; user: User; home: Home; homes?: Home[] }> {
    const res = await request<{ token: string; user: User; home: Home; homes?: Home[] }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, homeName }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; homes: Home[] }> {
    return request<{ user: User; homes: Home[] }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
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

  // Categories & Merchants
  async getCategories(homeId: string): Promise<Category[]> {
    return request<Category[]>(`/api/homes/${homeId}/categories`);
  },

  async createCategory(homeId: string, name: string, color = '#2563EB', icon = 'Tag'): Promise<Category> {
    return request<Category>(`/api/homes/${homeId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name, color, icon }),
    });
  },

  async getMerchants(homeId: string): Promise<Merchant[]> {
    return request<Merchant[]>(`/api/homes/${homeId}/merchants`);
  },

  async createMerchant(homeId: string, name: string, default_category_id?: string, default_expense_type: ExpenseType = 'variable'): Promise<Merchant> {
    return request<Merchant>(`/api/homes/${homeId}/merchants`, {
      method: 'POST',
      body: JSON.stringify({ name, default_category_id, default_expense_type }),
    });
  },

  // Dashboard
  async getDashboard(homeId: string, month?: string): Promise<DashboardData> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<DashboardData>(`/api/homes/${homeId}/dashboard${query}`);
  },

  // Expenses
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
    return request<Expense[]>(`/api/homes/${homeId}/expenses${qs ? `?${qs}` : ''}`);
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
    return request<Expense>(`/api/homes/${homeId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
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
    return request<Expense>(`/api/homes/${homeId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  },

  async deleteExpense(homeId: string, expenseId: string): Promise<{ success: boolean }> {
    return request(`/api/homes/${homeId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  // Recurring Expenses
  async getRecurring(homeId: string, month?: string): Promise<RecurringExpense[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<RecurringExpense[]>(`/api/homes/${homeId}/recurring${query}`);
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
    return request<MonthlyLimit[]>(`/api/homes/${homeId}/limits${query}`);
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
    return request(`/api/homes/${homeId}/reports/monthly${query}`);
  },

  getExportUrl(homeId: string, month?: string): string {
    const token = getStoredToken();
    const query = new URLSearchParams();
    if (month) query.append('month', month);
    if (token) query.append('token', token);
    return `/api/homes/${homeId}/reports/export?${query.toString()}`;
  },
};
