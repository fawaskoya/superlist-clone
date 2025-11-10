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
import { AnimatedBackground } from '@/components/AnimatedBackground';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Navigation Header */}
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-md transition-colors group" data-testid="link-home">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-lg p-1.5">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="font-semibold text-lg bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                {t('appName')}
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
          <div className="relative group w-full max-w-md">
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 from-primary/20 to-purple-500/10 rounded-lg pointer-events-none" />
            <Card className="w-full relative border border-border/50 bg-gradient-to-br from-card via-card/50 to-card/80 backdrop-blur-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500">
            <CardHeader className="space-y-2 relative">
              <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">{t('appName')}</CardTitle>
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
                className="w-full bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:from-primary/90 hover:via-purple-500 hover:to-pink-400 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-[1.02]"
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
      </div>
    </div>
  );
}
