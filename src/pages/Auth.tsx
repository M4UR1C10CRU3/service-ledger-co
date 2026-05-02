import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, signupSchema, LoginFormData, SignupFormData } from '@/lib/validations';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { empresa, getLogo } = useEmpresa();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  // Se não há empresa selecionada, redirecionar para seleção
  useEffect(() => {
    if (!empresa) {
      const savedEmpresa = localStorage.getItem('selectedEmpresa');
      if (!savedEmpresa) {
        navigate('/empresa');
      }
    }
  }, [empresa, navigate]);
  
  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nome: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      if (data.session) {
        // SECURITY: Validate user has active access in liberty_utilizadores
        const { data: lu } = await (supabase
          .from('liberty_utilizadores') as any)
          .select('id, ativo, eliminado')
          .eq('auth_user_id', data.session.user.id)
          .maybeSingle();

        if (!lu || lu.eliminado === true || lu.ativo === false) {
          await supabase.auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Acesso bloqueado',
            description: 'A sua conta não tem acesso autorizado ao Liberty. Contacte o administrador.',
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo de volta ao ${empresa?.nome || 'sistema'}.`,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupFormData) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            nome: values.nome,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar o cadastro.",
        });
        signupForm.reset();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast({ variant: 'destructive', title: 'Email obrigatório', description: 'Insira o seu email para recuperar a senha.' });
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email enviado!', description: 'Verifique a sua caixa de entrada para redefinir a senha.' });
      setForgotPasswordMode(false);
      setForgotEmail('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setForgotLoading(false);
    }
  };

  const logo = getLogo();
  const empresaNome = empresa?.nome || 'Sistema';
  const empresaNomeLegal = empresa?.nomeLegal || 'Gestão de Serviços';

  // Cores dinâmicas baseadas na empresa
  const primaryColor = empresa?.corPrimaria || '#3b82f6';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}10 0%, hsl(var(--background)) 50%, ${primaryColor}05 100%)`
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Welcome */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div 
              className="bg-white rounded-2xl p-4 shadow-lg"
              style={{ boxShadow: `0 4px 20px ${primaryColor}30` }}
            >
              <img 
                src={logo} 
                alt={`${empresaNome} Logo`} 
                className="h-20 w-auto"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo ao módulo de gestão financeira
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {empresaNomeLegal}
            </p>
          </div>
        </div>

        {/* Auth Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotPasswordMode ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Insira o seu email e enviaremos um link para redefinir a sua senha.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotLoading}
                  />
                </div>
                <Button className="w-full" disabled={forgotLoading} onClick={handleForgotPassword}>
                  {forgotLoading ? 'A enviar...' : 'Enviar link de recuperação'}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setForgotPasswordMode(false)}>
                  ← Voltar ao login
                </Button>
              </div>
            ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...loginForm.register('email')}
                      disabled={loading}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setForgotPasswordMode(true)}
                      >
                        Esqueci a senha
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...loginForm.register('password')}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Nome</Label>
                    <Input
                      id="signup-nome"
                      type="text"
                      placeholder="Seu nome"
                      {...signupForm.register('nome')}
                      disabled={loading}
                    />
                    {signupForm.formState.errors.nome && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.nome.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...signupForm.register('email')}
                      disabled={loading}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...signupForm.register('password')}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres, incluindo maiúscula, minúscula e número
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Link para trocar empresa */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/empresa')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Trocar empresa
          </Button>
        </div>
      </div>
    </div>
  );
}
