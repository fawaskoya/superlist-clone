import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertUserSchema, type InsertUser } from '@shared/schema';
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
import { CheckSquare, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect and email parameters from URL
  const searchParams = new URLSearchParams(window.location.search);
  const redirect = searchParams.get('redirect') || '/';
  const emailParam = searchParams.get('email') || '';

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: '',
      email: emailParam,
      password: '',
    },
  });

  const onSubmit = async (data: InsertUser) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<{ user: any; accessToken: string; refreshToken: string }>(
        'POST',
        '/api/auth/register',
        data
      );
      login(response.user, response.accessToken, response.refreshToken);
      setLocation(redirect);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Registration failed',
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
          <Sparkles className="h-12 w-12 text-yellow-400/80 mb-4" />
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-relaxed">
              "Join thousands of productive teams building the future with TaskFlow."
            </p>
            <p className="text-zinc-400 text-lg pt-2">
              Get started for free. No credit card required.
            </p>
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
            <h1 className="text-3xl font-bold tracking-tighter">Create an account</h1>
            <p className="text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        className="h-11"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                data-testid="button-register"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t('auth.registerButton')
                )}
              </Button>
            </form>
          </Form>

          <div className="px-8 text-center text-sm text-muted-foreground">
             {t('auth.alreadyHaveAccount')}{' '}
            <Link 
              href={`/login${window.location.search}`} 
              className="underline underline-offset-4 hover:text-primary font-medium transition-colors"
            >
              {t('auth.loginHere')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
