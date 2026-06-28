import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (role === 'cashier') {
      navigate('/pos', { replace: true });
    } else if (role === 'manager') {
      navigate('/dashboard', { replace: true });
    } else if (role === 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const normalized = error.message.toLowerCase();
        if (normalized.includes('invalid login credentials')) {
          toast.error('Invalid login credentials');
        } else if (normalized.includes('fetch') || normalized.includes('network')) {
          toast.error('Network error');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (!data.user) {
        toast.error('Authentication failed.');
        return;
      }

      console.log("USER ID:", data.user.id);

      const {
        data: employee,
        error: employeeError
      } = await supabase
        .from("employees")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("EMPLOYEE:", employee);
      console.log("EMPLOYEE ERROR:", employeeError);

      if (employeeError) {
        toast.error(employeeError.message);
        return;
      }

      if (!employee) {
        toast.error("Employee not found");
        return;
      }

      console.log("ROLE:", employee.role);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
            <ShoppingCart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SwiftPOS</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('signInSubtitle')}</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('enterEmail')}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enterPassword')}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? '...' : t('signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
