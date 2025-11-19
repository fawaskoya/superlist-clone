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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { CheckSquare, Quote } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect parameter from URL
  const searchParams = new URLSearchParams(window.location.search);
  const redirect = searchParams.get('redirect') || '/';
  
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
            if (res.ok) return res.json();
            return null;
          })
          .then(data => {
            if (data?.email) {
              setPrefillEmail(data.email);
              form.setValue('email', data.email);
            }
          })
          .catch(() => {
            // Ignore errors
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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left Side - Creative/Brand */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-zinc-900 text-white dark:border-r overflow-hidden">
        <div className="absolute inset-0 z-0">
           <AnimatedBackground />
        </div>
        
        <div className="relative z-10 flex items-center gap-2 text-lg font-medium">
          <div className="bg-primary rounded-lg p-1">
            <CheckSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">TaskFlow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <Quote className="h-12 w-12 text-primary/40 mb-4" />
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-relaxed">
              "TaskFlow completely transformed how our team collaborates. It's intuitive, fast, and beautiful."
            </p>
            <footer className="text-sm text-zinc-400 pt-4">
              Sofia Davis, <span className="text-primary">Product Manager</span>
            </footer>
          </blockquote>
        </div>
        
        <div className="relative z-10 text-sm text-zinc-400">
          © 2025 TaskFlow Inc.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="relative flex items-center justify-center p-8 bg-background">
        <div className="absolute top-4 right-4 flex items-center gap-2">
           <LanguageSwitcher />
           <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter">Welcome back</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your workspace
            </p>
          </div>

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
                        placeholder="name@example.com"
                        className="h-11"
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
                        placeholder="••••••••"
                        className="h-11"
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
                className="w-full h-11 font-medium bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t('auth.loginButton')
                )}
              </Button>
            </form>
          </Form>

          <div className="px-8 text-center text-sm text-muted-foreground">
             {t('auth.dontHaveAccount')}{' '}
            <Link 
              href={`/register${window.location.search}`} 
              className="underline underline-offset-4 hover:text-primary font-medium transition-colors"
            >
              {t('auth.registerHere')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
