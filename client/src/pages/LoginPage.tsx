import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginUser } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, CheckSquare } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect parameter from URL
  const searchParams = new URLSearchParams(window.location.search);
  const redirect = searchParams.get('redirect') || '/';
  
  // If redirect is an invitation, try to get email from invitation
  const [prefillEmail, setPrefillEmail] = useState<string>('');

  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // If redirect contains /invite/, fetch invitation to pre-fill email
    if (redirect.includes('/invite/')) {
      const token = redirect.split('/invite/')[1];
      if (token) {
        fetch(`/api/invitations/${token}`)
          .then(res => {
            if (res.ok) {
              return res.json();
            }
            return null;
          })
          .then(data => {
            if (data?.email) {
              setPrefillEmail(data.email);
              form.setValue('email', data.email);
            }
          })
          .catch(() => {
            // Ignore errors - just don't pre-fill
          });
      }
    }
  }, [redirect, form]);

  const onSubmit = async (data: LoginUser) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<{ user: any; accessToken: string; refreshToken: string }>(
        'POST',
        '/api/auth/login',
        data
      );
      login(response.user, response.accessToken, response.refreshToken);
      // Redirect to the specified path or dashboard
      setLocation(redirect);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-md transition-colors" data-testid="link-home">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">{t('appName')}</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">{t('appName')}</CardTitle>
          <CardDescription>{t('auth.login')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('auth.email')}
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('auth.password')}
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? t('common.loading') : t('auth.loginButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-center">
          <p className="text-muted-foreground">
            {t('auth.dontHaveAccount')}{' '}
            <button
              onClick={() => {
                const searchParams = new URLSearchParams(window.location.search);
                const redirect = searchParams.get('redirect') || '/register';
                const email = searchParams.get('email') || form.getValues('email') || '';
                const params = new URLSearchParams();
                if (redirect) params.set('redirect', redirect);
                if (email) params.set('email', email);
                setLocation(`/register${params.toString() ? `?${params.toString()}` : ''}`);
              }}
              className="text-primary hover:underline"
              data-testid="link-register"
            >
              {t('auth.registerHere')}
            </button>
          </p>
        </CardFooter>
        </Card>
      </div>
    </div>
  );
}
