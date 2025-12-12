import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { analytics, budgets, transactions, MonthlySummary, BudgetStatus, Transaction, CategoryBreakdown } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Button } from '../components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { token, user } = useAuthStore()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  const loadDashboardData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [summaryData, budgetData, transactionData, categoryData] = await Promise.all([
        analytics.monthly(token),
        budgets.status(token),
        transactions.list(token, { limit: 5 }),
        analytics.categories(token),
      ])
      setSummary(summaryData)
      setBudgetStatuses(budgetData)
      setRecentTransactions(transactionData)
      setCategoryBreakdown(categoryData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const pieData = categoryBreakdown.map(cat => ({
    name: cat.category_name,
    value: Number(cat.total),
    color: cat.category_color,
    icon: cat.category_icon,
  }))

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zdravo, {user?.name}!</h1>
          <p className="text-muted-foreground">Evo pregleda vaših finansija</p>
        </div>
        <Link to="/transactions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova transakcija
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prihodi</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(Number(summary?.total_income || 0))}
            </div>
            <p className="text-xs text-muted-foreground">Ovaj mesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rashodi</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(Number(summary?.total_expenses || 0))}
            </div>
            <p className="text-xs text-muted-foreground">Ovaj mesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilans</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Number(summary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Number(summary?.net || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.transaction_count || 0} transakcija
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {budgetStatuses.some(b => b.is_over_threshold) && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Upozorenja budžeta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgetStatuses.filter(b => b.is_over_threshold).map(status => (
                <div key={status.budget.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>{status.budget.category?.icon}</span>
                    <span>{status.budget.category?.name}</span>
                  </span>
                  <span className={status.is_over_budget ? 'text-red-600 font-bold' : 'text-yellow-600'}>
                    {status.percentage.toFixed(0)}% iskorišćeno
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Rashodi po kategorijama</CardTitle>
            <CardDescription>Ovaj mesec</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nema podataka za prikaz
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Budžeti</CardTitle>
            <CardDescription>Pregled potrošnje po budžetima</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetStatuses.length > 0 ? (
              <div className="space-y-4">
                {budgetStatuses.slice(0, 5).map(status => (
                  <div key={status.budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{status.budget.category?.icon}</span>
                        <span>{status.budget.category?.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(status.spent))} / {formatCurrency(Number(status.budget.amount))}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(status.percentage, 100)}
                      className="h-2"
                      indicatorClassName={
                        status.is_over_budget
                          ? 'bg-red-500'
                          : status.is_over_threshold
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <p>Nemate postavljene budžete</p>
                <Link to="/budgets">
                  <Button variant="link">Postavite budžet</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Poslednje transakcije</CardTitle>
            <CardDescription>Vaše najnovije transakcije</CardDescription>
          </div>
          <Link to="/transactions">
            <Button variant="outline" size="sm">Vidi sve</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${transaction.category?.color}20` }}
                    >
                      {transaction.category?.icon}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description || transaction.category?.name}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.category?.is_income ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.category?.is_income ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
              <p>Nemate transakcija</p>
              <Link to="/transactions/new">
                <Button variant="link">Dodajte prvu transakciju</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
