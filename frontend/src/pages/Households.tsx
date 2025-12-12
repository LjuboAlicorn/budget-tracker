import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog'
import { Users, Plus, Copy, UserPlus, LogOut, Trash2, Crown, CheckCircle } from 'lucide-react'

interface Household {
  id: string
  name: string
  owner_id: string
  invite_code: string
  created_at: string
}

interface Member {
  id: string
  user_id: string
  user_name: string
  user_email: string
  role: 'owner' | 'member'
  joined_at: string
}

export default function Households() {
  const { token, user } = useAuthStore()
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [showMembersDialog, setShowMembersDialog] = useState(false)

  // Form state
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      loadHouseholds()
    }
  }, [token])

  const loadHouseholds = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/households', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setHouseholds(data)
    } catch (error) {
      console.error('Failed to load households:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (householdId: string) => {
    if (!token) return
    try {
      const response = await fetch(`http://localhost:8000/api/households/${householdId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !householdName) return

    setSubmitting(true)
    try {
      const response = await fetch('http://localhost:8000/api/households', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: householdName }),
      })

      if (!response.ok) throw new Error('Failed to create')

      setShowCreateDialog(false)
      setHouseholdName('')
      loadHouseholds()
    } catch (error) {
      console.error('Failed to create household:', error)
      alert('Greška pri kreiranju domaćinstva')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !inviteCode) return

    setSubmitting(true)
    try {
      const response = await fetch('http://localhost:8000/api/households/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to join')
      }

      setShowJoinDialog(false)
      setInviteCode('')
      loadHouseholds()
    } catch (error: any) {
      console.error('Failed to join household:', error)
      alert(error.message || 'Greška pri pridruživanju')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  const handleRegenerateCode = async (householdId: string) => {
    if (!token || !confirm('Da li ste sigurni? Stari kod više neće raditi.')) return

    try {
      const response = await fetch(`http://localhost:8000/api/households/${householdId}/regenerate-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to regenerate')

      loadHouseholds()
    } catch (error) {
      console.error('Failed to regenerate code:', error)
      alert('Greška')
    }
  }

  const handleRemoveMember = async (householdId: string, userId: string) => {
    if (!token || !confirm('Da li ste sigurni da želite da uklonite člana?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/households/${householdId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to remove')

      loadMembers(householdId)
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Greška')
    }
  }

  const handleLeave = async (householdId: string) => {
    if (!token || !confirm('Da li ste sigurni da želite da napustite domaćinstvo?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/households/${householdId}/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail)
      }

      loadHouseholds()
      setShowMembersDialog(false)
    } catch (error: any) {
      alert(error.message || 'Greška')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domaćinstva</h1>
          <p className="text-muted-foreground">Delite budžet sa porodicom ili partnerom</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Pridruži se
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo domaćinstvo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : households.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nema domaćinstava</p>
            <p className="text-sm text-muted-foreground mb-4">
              Kreirajte novo ili se pridružite postojećem
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {households.map(household => (
            <Card key={household.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {household.name}
                  {household.owner_id === user?.id && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Kreirano: {new Date(household.created_at).toLocaleDateString('sr-RS')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Kod za pozivnicu</Label>
                  <div className="flex gap-2">
                    <Input value={household.invite_code} readOnly className="font-mono" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopyCode(household.invite_code)}
                    >
                      {copiedCode === household.invite_code ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedHousehold(household)
                      loadMembers(household.id)
                      setShowMembersDialog(true)
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Članovi
                  </Button>
                  {household.owner_id === user?.id ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRegenerateCode(household.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleLeave(household.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo domaćinstvo</DialogTitle>
            <DialogDescription>Kreirajte domaćinstvo za deljenje budžeta</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naziv domaćinstva</Label>
              <Input
                id="name"
                placeholder="Npr. Porodica Petrović"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Kreiranje...' : 'Kreiraj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pridruži se domaćinstvu</DialogTitle>
            <DialogDescription>Unesite kod za pozivnicu</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kod za pozivnicu</Label>
              <Input
                id="code"
                placeholder="Unesite kod"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowJoinDialog(false)}>
                Otkaži
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Pridruživanje...' : 'Pridruži se'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Članovi - {selectedHousehold?.name}</DialogTitle>
            <DialogDescription>Upravljajte članovima domaćinstva</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {member.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {member.user_name}
                      {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500" />}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user_email}</p>
                  </div>
                </div>
                {selectedHousehold?.owner_id === user?.id && member.user_id !== user?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => selectedHousehold && handleRemoveMember(selectedHousehold.id, member.user_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
