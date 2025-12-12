const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<User>('/auth/me', { token }),
}

// Categories
export const categories = {
  list: (token: string, householdId?: string) => {
    const url = householdId ? `/categories?household_id=${householdId}` : '/categories'
    return request<Category[]>(url, { token })
  },

  create: (token: string, data: Partial<Category>) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: Partial<Category>) =>
    request<Category>('/categories/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  delete: (token: string, id: string) =>
    request<void>('/categories/' + id, { method: 'DELETE', token }),
}

// Transactions
export const transactions = {
  list: (token: string, filters?: TransactionFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const query = params.toString()
    const url = query ? '/transactions?' + query : '/transactions'
    return request<Transaction[]>(url, { token })
  },

  create: (token: string, data: Partial<Transaction>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (token: string, id: string, data: Partial<Transaction>) =>
    request<Transaction>('/transactions/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  delete: (token: string, id: string) =>
    request<void>('/transactions/' + id, { method: 'DELETE', token }),
}

// Budgets
export const budgets = {
  list: (token: string, month?: string, householdId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    if (householdId) params.append('household_id', householdId)
    const query = params.toString()
    const url = query ? '/budgets?' + query : '/budgets'
    return request<Budget[]>(url, { token })
  },

  status: (token: string, month?: string, householdId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    if (householdId) params.append('household_id', householdId)
    const query = params.toString()
    const url = query ? '/budgets/status?' + query : '/budgets/status'
    return request<BudgetStatus[]>(url, { token })
  },

  create: (token: string, data: Partial<Budget>) =>
    request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  delete: (token: string, id: string) =>
    request<void>('/budgets/' + id, { method: 'DELETE', token }),
}

// Analytics
export const analytics = {
  monthly: (token: string, month?: string, householdId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    if (householdId) params.append('household_id', householdId)
    const query = params.toString()
    const url = query ? '/analytics/monthly?' + query : '/analytics/monthly'
    return request<MonthlySummary>(url, { token })
  },

  categories: (token: string, month?: string, isIncome = false, householdId?: string) => {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    params.append('is_income', String(isIncome))
    if (householdId) params.append('household_id', householdId)
    return request<CategoryBreakdown[]>('/analytics/categories?' + params.toString(), { token })
  },

  trends: (token: string, days = 30, householdId?: string) => {
    const params = new URLSearchParams()
    params.append('days', String(days))
    if (householdId) params.append('household_id', householdId)
    return request<SpendingTrend[]>('/analytics/trends?' + params.toString(), { token })
  },
}

// AI Advisor
export const ai = {
  analyze: (token: string, householdId?: string) =>
    request<AIAnalysis>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ household_id: householdId }),
      token,
    }),

  chat: (token: string, message: string, householdId?: string) =>
    request<{ response: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, household_id: householdId }),
      token,
    }),
}

// Types
export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  is_income: boolean
  is_default: boolean
  user_id?: string
  household_id?: string
}

export interface Transaction {
  id: string
  amount: number
  description?: string
  date: string
  category_id: string
  user_id: string
  household_id?: string
  is_shared: boolean
  category?: Category
}

export interface TransactionFilters {
  start_date?: string
  end_date?: string
  category_id?: string
  is_income?: boolean
  is_shared?: boolean
  household_id?: string
  search?: string
  skip?: number
  limit?: number
}

export interface Budget {
  id: string
  amount: number
  month: string
  category_id: string
  user_id: string
  household_id?: string
  alert_threshold: number
  category?: Category
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  percentage: number
  is_over_threshold: boolean
  is_over_budget: boolean
}

export interface MonthlySummary {
  month: string
  total_income: number
  total_expenses: number
  net: number
  transaction_count: number
}

export interface CategoryBreakdown {
  category_id: string
  category_name: string
  category_icon: string
  category_color: string
  total: number
  percentage: number
  transaction_count: number
}

export interface SpendingTrend {
  date: string
  amount: number
}

export interface AIAnalysis {
  analysis: string
  suggestions: string[]
}
