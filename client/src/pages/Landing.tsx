import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  CheckCircle2,
  ListTodo,
  Users,
  Zap,
  Globe,
  Bell,
  Search,
  ArrowRight,
} from 'lucide-react';

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ListTodo,
      title: t('landing.features.tasks.title'),
      description: t('landing.features.tasks.description'),
    },
    {
      icon: Users,
      title: t('landing.features.collaboration.title'),
      description: t('landing.features.collaboration.description'),
    },
    {
      icon: Zap,
      title: t('landing.features.ai.title'),
      description: t('landing.features.ai.description'),
    },
    {
      icon: Globe,
      title: t('landing.features.bilingual.title'),
      description: t('landing.features.bilingual.description'),
    },
    {
      icon: Bell,
      title: t('landing.features.notifications.title'),
      description: t('landing.features.notifications.description'),
    },
    {
      icon: Search,
      title: t('landing.features.search.title'),
      description: t('landing.features.search.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">{t('landing.title')}</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">
                  {t('landing.nav.login')}
                </Button>
              </Link>
              <Link href="/register">
                <Button data-testid="button-signup">
                  {t('landing.nav.signup')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              {t('landing.hero.title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" data-testid="button-hero-signup">
                {t('landing.hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8" data-testid="button-hero-login">
                {t('landing.hero.login')}
              </Button>
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{t('landing.hero.features.free')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{t('landing.hero.features.ai')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{t('landing.hero.features.realtime')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate" data-testid={`feature-card-${index}`}>
                <CardContent className="p-6 space-y-3">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              {t('landing.cta.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8" data-testid="button-cta-signup">
                  {t('landing.cta.button')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-medium">{t('landing.title')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('landing.footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
