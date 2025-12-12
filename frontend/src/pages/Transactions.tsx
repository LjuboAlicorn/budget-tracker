import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { transactions, categories, Transaction, Category } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Plus, Search, Trash2, Edit, Filter } from 'lucide-react'

export default function Transactions() {
  const { token } = useAuthStore()
  const [transactionList, setTransactionList] = useState<Transaction[]>([])
  const [categoryList, setCategoryList] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // Form state
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadTransactions()
    }
  }, [token, search, filterCategory, filterType])

  const loadData = async () => {
    if (!token) return
    try {
      const cats = await categories.list(token)
      setCategoryList(cats)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadTransactions = async () => {
    if (!token) return
    setLoading(true)
    try {
      const filters: any = {}
      if (search) filters.search = search
      if (filterCategory) filters.category_id = filterCategory
      if (filterType === 'income') filters.is_income = true
      if (filterType === 'expense') filters.is_income = false

      const data = await transactions.list(token, filters)
      setTransactionList(data)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !formCategoryId || !formAmount) return

    setFormSubmitting(true)
    try {
      if (editingTransaction) {
        await transactions.update(token, editingTransaction.id, {
          amount: parseFloat(formAmount),
          description: formDescription,
          date: formDate,
          category_id: formCategoryId,
        })
      } else {
        await transactions.create(token, {
          amount: parseFloat(formAmount),
          description: formDescription,
          date: formDate,
          category_id: formCategoryId,
        })
      }
      setShowAddDialog(false)
      setEditingTransaction(null)
      resetForm()
      loadTransactions()
    } catch (error) {
      console.error('Failed to save transaction:', error)
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Da li ste sigurni da želite da obrišete ovu transakciju?')) return
    try {
      await transactions.delete(token, id)
      loadTransactions()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormAmount(String(transaction.amount))
    setFormDescription(transaction.description || '')
    setFormDate(transaction.date)
    setFormCategoryId(transaction.category_id)
    setShowAddDialog(true)
  }

  const resetForm = () => {
    setFormAmount('')
    setFormDescription('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormCategoryId('')
  }

  const expenseCategories = categoryList.filter(c => !c.is_income)
  const incomeCategories = categoryList.filter(c => c.is_income)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transakcije</h1>
        <Button onClick={() => { resetForm(); setEditingTransaction(null); setShowAddDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova transakcija
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži transakcije..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sve kategorije" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sve kategorije</SelectItem>
                {categoryList.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Svi tipovi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Svi tipovi</SelectItem>
                <SelectItem value="income">Prihodi</SelectItem>
                <SelectItem value="expense">Rashodi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : transactionList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nema transakcija</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactionList.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${transaction.category?.color}20` }}
                    >
                      {transaction.category?.icon}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description || transaction.category?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.category?.name} • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold text-lg ${transaction.category?.is_income ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.category?.is_income ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(transaction)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Izmeni transakciju' : 'Nova transakcija'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Iznos (RSD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategorija</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberi kategoriju" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>Izaberi kategoriju</SelectItem>
                  {expenseCategories.length > 0 && (
                    <>
                      <SelectItem value="__expense_header" disabled className="font-semibold">
                        Rashodi
                      </SelectItem>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {incomeCategories.length > 0 && (
                    <>
                      <SelectItem value="__income_header" disabled className="font-semibold">
                        Prihodi
                      </SelectItem>
                      {incomeCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis (opciono)</Label>
              <Input
                id="description"
                placeholder="Npr. Kupovina u prodavnici"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? 'Čuvanje...' : (editingTransaction ? 'Sačuvaj' : 'Dodaj')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
