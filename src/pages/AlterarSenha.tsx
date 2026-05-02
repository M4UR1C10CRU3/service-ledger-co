import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

const requisitos = [
  { label: 'Pelo menos 8 caracteres', test: (s: string) => s.length >= 8 },
  { label: 'Uma letra maiúscula (A-Z)', test: (s: string) => /[A-Z]/.test(s) },
  { label: 'Uma letra minúscula (a-z)', test: (s: string) => /[a-z]/.test(s) },
  { label: 'Um número (0-9)', test: (s: string) => /[0-9]/.test(s) },
  { label: 'Um caractere especial (!@#$...)', test: (s: string) => /[^A-Za-z0-9]/.test(s) },
];

export default function AlterarSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const allValid = requisitos.every(r => r.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({ variant: 'destructive', title: 'Senha atual obrigatória', description: 'Insira a sua senha atual para confirmar a sua identidade.' });
      return;
    }
    if (!allValid) {
      toast({ variant: 'destructive', title: 'Senha não atende aos requisitos', description: 'A nova senha deve cumprir todos os critérios de segurança.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Senhas não coincidem', description: 'A confirmação deve ser igual à nova senha.' });
      return;
    }
    if (newPassword === currentPassword) {
      toast({ variant: 'destructive', title: 'Senha repetida', description: 'A nova senha deve ser diferente da atual.' });
      return;
    }

    setLoading(true);
    try {
      // Reautenticar usando email do usuário + senha atual
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user?.email) throw new Error('Sessão inválida. Faça login novamente.');

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: currentPassword,
      });
      if (signInErr) throw new Error('Senha atual incorreta.');

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      toast({ title: 'Senha alterada com sucesso!', description: 'A sua nova senha já está ativa.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar senha', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-xl">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alterar Senha</h1>
          <p className="text-sm text-muted-foreground">Atualize a sua senha para uma mais segura</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Segurança da Conta
          </CardTitle>
          <CardDescription>
            Para sua segurança, confirme a sua senha atual antes de definir uma nova.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>

            {/* Requisitos */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground mb-2">Requisitos da nova senha:</p>
              {requisitos.map((req, i) => {
                const ok = req.test(newPassword);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={ok ? 'text-success' : 'text-muted-foreground'}>
                      {ok ? '✓' : '○'}
                    </span>
                    <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !allValid || !currentPassword || newPassword !== confirmPassword} className="flex-1">
                {loading ? 'A alterar...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
