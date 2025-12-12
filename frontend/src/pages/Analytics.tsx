import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { analytics, ai, MonthlySummary, CategoryBreakdown, SpendingTrend, AIAnalysis } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, BarChart, Bar, CartesianGrid
} from 'recharts'
import { Sparkles, TrendingUp, RefreshCw, Send } from 'lucide-react'
import { Input } from '../components/ui/input'

export default function Analytics() {
  const { token } = useAuthStore()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([])
  const [incomeBreakdown, setIncomeBreakdown] = useState<CategoryBreakdown[]>([])
  const [trends, setTrends] = useState<SpendingTrend[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [summaryData, expenseData, incomeData, trendData] = await Promise.all([
        analytics.monthly(token),
        analytics.categories(token, undefined, false),
        analytics.categories(token, undefined, true),
        analytics.trends(token, 30),
      ])
      setSummary(summaryData)
      setExpenseBreakdown(expenseData)
      setIncomeBreakdown(incomeData)
      setTrends(trendData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAiAnalysis = async () => {
    if (!token) return
    setAiLoading(true)
    try {
      const analysis = await ai.analyze(token)
      setAiAnalysis(analysis)
    } catch (error) {
      console.error('Failed to load AI analysis:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !chatMessage.trim()) return

    setChatLoading(true)
    try {
      const response = await ai.chat(token, chatMessage)
      setChatResponse(response.response)
      setChatMessage('')
    } catch (error) {
      console.error('Failed to chat with AI:', error)
      setChatResponse('Greška pri komunikaciji sa AI savetnikom.')
    } finally {
      setChatLoading(false)
    }
  }

  const pieData = expenseBreakdown.map(cat => ({
    name: cat.category_name,
    value: Number(cat.total),
    color: cat.category_color,
  }))

  const trendData = trends.map(t => ({
    date: new Date(t.date).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' }),
    amount: Number(t.amount),
  }))

  const comparisonData = [
    { name: 'Prihodi', value: Number(summary?.total_income || 0), fill: '#22C55E' },
    { name: 'Rashodi', value: Number(summary?.total_expenses || 0), fill: '#EF4444' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analitika</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Pregled</TabsTrigger>
          <TabsTrigger value="categories">Kategorije</TabsTrigger>
          <TabsTrigger value="trends">Trendovi</TabsTrigger>
          <TabsTrigger value="ai">AI Savetnik</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Income vs Expense */}
          <Card>
            <CardHeader>
              <CardTitle>Prihodi vs Rashodi</CardTitle>
              <CardDescription>Ovaj mesec</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prosečna dnevna potrošnja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(summary?.total_expenses || 0) / 30)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Broj transakcija</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.transaction_count || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Stopa štednje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${Number(summary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary?.total_income ? ((Number(summary.net) / Number(summary.total_income)) * 100).toFixed(0) : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Najveća kategorija</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold flex items-center gap-2">
                  {expenseBreakdown[0]?.category_icon} {expenseBreakdown[0]?.category_name || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {expenseBreakdown[0] ? formatCurrency(Number(expenseBreakdown[0].total)) : '-'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Rashodi po kategorijama</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {expenseBreakdown.map(cat => (
                        <div key={cat.category_id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.category_color }} />
                            {cat.category_icon} {cat.category_name}
                          </span>
                          <span className="font-medium">{formatCurrency(Number(cat.total))}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nema podataka
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Prihodi po kategorijama</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {incomeBreakdown.map(cat => (
                      <div key={cat.category_id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {cat.category_icon} {cat.category_name}
                          </span>
                          <span className="font-medium text-green-600">{formatCurrency(Number(cat.total))}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nema podataka
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend potrošnje (30 dana)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analiza potrošnje
              </CardTitle>
              <CardDescription>
                Dobijte personalizovane savete bazirane na vašim finansijama
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiAnalysis ? (
                <div className="text-center py-8">
                  <Button onClick={loadAiAnalysis} disabled={aiLoading}>
                    {aiLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analiziram...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generiši analizu
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Analiza</h4>
                    <p className="text-muted-foreground">{aiAnalysis.analysis}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Saveti za uštedu</h4>
                    <ul className="space-y-2">
                      {aiAnalysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" onClick={loadAiAnalysis} disabled={aiLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${aiLoading ? 'animate-spin' : ''}`} />
                    Osvezi analizu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Pitajte AI savetnika</CardTitle>
              <CardDescription>
                Postavite pitanje o vašim finansijama
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChat} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Npr. Kako mogu da uštedim na hrani?"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <Button type="submit" disabled={chatLoading || !chatMessage.trim()}>
                    {chatLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {chatResponse && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p>{chatResponse}</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
