import { useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { categories, Category } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PreviewRow {
  [key: string]: string
}

export default function ImportCSV() {
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<PreviewRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [categoryList, setCategoryList] = useState<Category[]>([])

  // Mapping state
  const [dateColumn, setDateColumn] = useState('')
  const [amountColumn, setAmountColumn] = useState('')
  const [descriptionColumn, setDescriptionColumn] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dateFormat, setDateFormat] = useState('%d.%m.%Y')
  const [negateAmounts, setNegateAmounts] = useState(false)

  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile || !token) return

    setFile(selectedFile)
    setResult(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:8000/api/import/csv/preview', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) throw new Error('Preview failed')

      const data = await response.json()
      setColumns(data.columns)
      setSampleRows(data.sample_rows)
      setTotalRows(data.total_rows)

      // Auto-detect common column names
      const cols = data.columns.map((c: string) => c.toLowerCase())
      if (cols.includes('datum') || cols.includes('date')) {
        setDateColumn(data.columns.find((c: string) => c.toLowerCase() === 'datum' || c.toLowerCase() === 'date'))
      }
      if (cols.includes('iznos') || cols.includes('amount')) {
        setAmountColumn(data.columns.find((c: string) => c.toLowerCase() === 'iznos' || c.toLowerCase() === 'amount'))
      }
      if (cols.includes('opis') || cols.includes('description')) {
        setDescriptionColumn(data.columns.find((c: string) => c.toLowerCase() === 'opis' || c.toLowerCase() === 'description'))
      }

      // Load categories
      const cats = await categories.list(token)
      setCategoryList(cats.filter(c => !c.is_income))
    } catch (error) {
      console.error('Failed to preview CSV:', error)
      alert('Greška pri učitavanju CSV fajla')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file || !token || !dateColumn || !amountColumn || !categoryId) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('date_column', dateColumn)
      formData.append('amount_column', amountColumn)
      if (descriptionColumn) formData.append('description_column', descriptionColumn)
      formData.append('category_id', categoryId)
      formData.append('date_format', dateFormat)
      formData.append('negate_amounts', String(negateAmounts))

      const response = await fetch('http://localhost:8000/api/import/csv/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) throw new Error('Import failed')

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Failed to import:', error)
      alert('Greška pri uvozu transakcija')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Uvoz CSV</h1>
          <p className="text-muted-foreground">Uvezite transakcije iz bankovnog izvoda</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/transactions')}>
          Nazad na transakcije
        </Button>
      </div>

      {!file && (
        <Card>
          <CardHeader>
            <CardTitle>Odaberite CSV fajl</CardTitle>
            <CardDescription>
              Prihvataju se CSV fajlovi sa kolonama za datum, iznos i opis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Izaberite fajl</span>
                </Button>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {file && columns.length > 0 && !result && (
        <>
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pregled fajla
              </CardTitle>
              <CardDescription>
                {totalRows} redova u fajlu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {columns.map(col => (
                        <th key={col} className="text-left p-2 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i} className="border-b">
                        {columns.map(col => (
                          <td key={col} className="p-2">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Mapiranje kolona</CardTitle>
              <CardDescription>Povežite kolone iz CSV-a sa poljima transakcije</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kolona za datum *</Label>
                  <Select value={dateColumn} onValueChange={setDateColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kolonu" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Format datuma</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%d.%m.%Y">DD.MM.YYYY (31.12.2024)</SelectItem>
                      <SelectItem value="%Y-%m-%d">YYYY-MM-DD (2024-12-31)</SelectItem>
                      <SelectItem value="%d/%m/%Y">DD/MM/YYYY (31/12/2024)</SelectItem>
                      <SelectItem value="%m/%d/%Y">MM/DD/YYYY (12/31/2024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kolona za iznos *</Label>
                  <Select value={amountColumn} onValueChange={setAmountColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kolonu" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kolona za opis</Label>
                  <Select value={descriptionColumn} onValueChange={setDescriptionColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opciono" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Bez opisa</SelectItem>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategorija *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Opcije</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="negate"
                      checked={negateAmounts}
                      onChange={(e) => setNegateAmounts(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="negate" className="text-sm">
                      Obrni znak iznosa (za bankovne izvode)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleImport}
                  disabled={!dateColumn || !amountColumn || !categoryId || importing}
                  className="flex-1"
                >
                  {importing ? 'Uvozim...' : `Uvezi ${totalRows} transakcija`}
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setResult(null) }}>
                  Otkaži
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Uvoz završen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Uvezeno</p>
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Preskočeno</p>
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Greške</p>
                <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Greške pri uvozu:
                </p>
                <ul className="text-sm space-y-1 pl-6 list-disc text-muted-foreground">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => navigate('/transactions')} className="flex-1">
                Vidi transakcije
              </Button>
              <Button variant="outline" onClick={() => { setFile(null); setResult(null) }}>
                Uvezi još
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
