import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Wallet } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { register, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Lozinke se ne poklapaju')
      return
    }

    if (password.length < 6) {
      setLocalError('Lozinka mora imati najmanje 6 karaktera')
      return
    }

    try {
      await register(email, password, name)
      navigate('/')
    } catch {
      // Error is handled by store
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Kreirajte nalog</CardTitle>
          <CardDescription>
            Unesite podatke za registraciju
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {displayError && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                {displayError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Ime</Label>
              <Input
                id="name"
                type="text"
                placeholder="Vaše ime"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearError()
                  setLocalError('')
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vas@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearError()
                  setLocalError('')
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lozinka</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError()
                  setLocalError('')
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrdi lozinku</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearError()
                  setLocalError('')
                }}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registracija...' : 'Registruj se'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Već imate nalog?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Prijavite se
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
