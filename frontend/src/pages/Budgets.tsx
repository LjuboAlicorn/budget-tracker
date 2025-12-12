import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { budgets, categories, BudgetStatus, Category } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Progress } from '../components/ui/progress'
import { Plus, Trash2, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Budgets() {
  const { token } = useAuthStore()
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formThreshold, setFormThreshold] = useState('80')
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [statusData, catData] = await Promise.all([
        budgets.status(token),
        categories.list(token),
      ])
      setBudgetStatuses(statusData)
      setCategoryList(catData.filter(c => !c.is_income)) // Only expense categories
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !formCategoryId || !formAmount) return

    setFormSubmitting(true)
    try {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      await budgets.create(token, {
        category_id: formCategoryId,
        amount: parseFloat(formAmount),
        month: firstDayOfMonth,
        alert_threshold: parseInt(formThreshold),
      })
      setShowAddDialog(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to create budget:', error)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Da li ste sigurni da želite da obrišete ovaj budžet?')) return
    try {
      await budgets.delete(token, id)
      loadData()
    } catch (error) {
      console.error('Failed to delete budget:', error)
    }
  }

  const resetForm = () => {
    setFormCategoryId('')
    setFormAmount('')
    setFormThreshold('80')
  }

  // Categories that don't have a budget yet
  const availableCategories = categoryList.filter(
    cat => !budgetStatuses.some(b => b.budget.category_id === cat.id)
  )

  const totalBudget = budgetStatuses.reduce((sum, s) => sum + Number(s.budget.amount), 0)
  const totalSpent = budgetStatuses.reduce((sum, s) => sum + Number(s.spent), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budžeti</h1>
        <Button onClick={() => { resetForm(); setShowAddDialog(true) }} disabled={availableCategories.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Novi budžet
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupan budžet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Ovaj mesec</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potrošeno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% budžeta` : 'Nema budžeta'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Preostalo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBudget - totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Za ovaj mesec</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader>
          <CardTitle>Budžeti po kategorijama</CardTitle>
          <CardDescription>Pratite potrošnju u odnosu na postavljene limite</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : budgetStatuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nemate postavljene budžete</p>
              <p className="text-sm">Dodajte budžet da biste pratili potrošnju</p>
            </div>
          ) : (
            <div className="space-y-6">
              {budgetStatuses.map(status => (
                <div key={status.budget.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${status.budget.category?.color}20` }}
                      >
                        {status.budget.category?.icon}
                      </div>
                      <div>
                        <p className="font-medium">{status.budget.category?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(Number(status.spent))} / {formatCurrency(Number(status.budget.amount))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {status.is_over_threshold && (
                        <AlertTriangle className={`h-5 w-5 ${status.is_over_budget ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                      <span className={`font-semibold ${
                        status.is_over_budget ? 'text-red-600' :
                        status.is_over_threshold ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {status.percentage.toFixed(0)}%
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(status.budget.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(status.percentage, 100)}
                    className="h-3"
                    indicatorClassName={
                      status.is_over_budget
                        ? 'bg-red-500'
                        : status.is_over_threshold
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }
                  />
                  {status.is_over_budget && (
                    <p className="text-sm text-red-600">
                      Prekoračili ste budžet za {formatCurrency(Math.abs(Number(status.remaining)))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novi budžet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategorija</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberi kategoriju" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Mesečni limit (RSD)</Label>
              <Input
                id="amount"
                type="number"
                step="100"
                placeholder="10000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Prag upozorenja (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="50"
                max="100"
                placeholder="80"
                value={formThreshold}
                onChange={(e) => setFormThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dobićete upozorenje kada potrošnja pređe ovaj procenat
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? 'Čuvanje...' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
