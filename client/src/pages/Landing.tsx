import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  CheckCircle2,
  ListTodo,
  Users,
  Zap,
  Globe,
  Bell,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import heroImage from '@assets/generated_images/Task_management_hero_image_47e8160b.png';

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ListTodo,
      title: t('landing.features.tasks.title'),
      description: t('landing.features.tasks.description'),
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      icon: Users,
      title: t('landing.features.collaboration.title'),
      description: t('landing.features.collaboration.description'),
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      icon: Zap,
      title: t('landing.features.ai.title'),
      description: t('landing.features.ai.description'),
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      icon: Globe,
      title: t('landing.features.bilingual.title'),
      description: t('landing.features.bilingual.description'),
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      icon: Bell,
      title: t('landing.features.notifications.title'),
      description: t('landing.features.notifications.description'),
      gradient: 'from-rose-500 to-red-500',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
    {
      icon: Search,
      title: t('landing.features.search.title'),
      description: t('landing.features.search.description'),
      gradient: 'from-indigo-500 to-blue-500',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop & Tablet Navigation */}
            <div className="hidden sm:flex h-16 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-lg blur-sm opacity-75" />
                  <CheckCircle2 className="relative h-7 w-7 text-primary" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t('landing.title')}
                </span>
              </div>
              
              {/* Navigation Links */}
              <div className="flex items-center gap-4 md:gap-6 flex-1 justify-center">
                <a href="#home" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-home">
                  {t('landing.nav.home')}
                </a>
                <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-features">
                  {t('landing.nav.features')}
                </a>
                <a href="#about" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-about">
                  {t('landing.nav.about')}
                </a>
                <a href="#pricing" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-pricing">
                  {t('landing.nav.pricing')}
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LanguageSwitcher />
                <Link href="/login">
                  <Button variant="ghost" data-testid="button-login">
                    {t('landing.nav.login')}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-primary to-purple-600" data-testid="button-signup">
                    {t('landing.nav.signup')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex sm:hidden flex-col">
              {/* Top Row: Logo + Actions */}
              <div className="flex h-14 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-lg blur-sm opacity-75" />
                    <CheckCircle2 className="relative h-6 w-6 text-primary" />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {t('landing.title')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <Link href="/register">
                    <Button size="sm" className="bg-gradient-to-r from-primary to-purple-600" data-testid="button-signup-mobile">
                      {t('landing.nav.signup')}
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Bottom Row: Navigation Links */}
              <div className="flex items-center gap-4 pb-2 overflow-x-auto">
                <a href="#home" className="text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-home-mobile">
                  {t('landing.nav.home')}
                </a>
                <a href="#features" className="text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-features-mobile">
                  {t('landing.nav.features')}
                </a>
                <a href="#about" className="text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-about-mobile">
                  {t('landing.nav.about')}
                </a>
                <a href="#pricing" className="text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-pricing-mobile">
                  {t('landing.nav.pricing')}
                </a>
                <a href="/login" className="text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap" data-testid="link-login-mobile">
                  {t('landing.nav.login')}
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="home" className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 md:pt-20 md:pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left space-y-8">
                <div className="space-y-6">
                  <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" />
                    {t('landing.hero.features.ai')}
                  </Badge>
                  
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                    <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                      {t('landing.hero.title')}
                    </span>
                  </h1>
                  
                  <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                    {t('landing.hero.subtitle')}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                  <Link href="/register">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto text-base h-12 px-8 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/25" 
                      data-testid="button-hero-signup"
                    >
                      {t('landing.hero.cta')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full sm:w-auto text-base h-12 px-8 border-2" 
                      data-testid="button-hero-login"
                    >
                      {t('landing.hero.login')}
                    </Button>
                  </Link>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <Badge variant="secondary" className="px-4 py-2 text-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('landing.hero.features.free')}
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('landing.hero.features.realtime')}
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('landing.hero.features.bilingual')}
                  </Badge>
                </div>
              </div>
              
              {/* Right Hero Image */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10" />
                <img 
                  src={heroImage} 
                  alt="KBN Superlist Hero" 
                  className="w-full h-auto rounded-2xl shadow-2xl"
                  data-testid="img-hero"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-5 mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                {t('landing.features.title')}
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('landing.features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="group hover-elevate border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur" 
                  data-testid={`feature-card-${index}`}
                >
                  <CardContent className="p-6 space-y-4">
                    <div className={`relative h-14 w-14 rounded-xl ${feature.iconBg} flex items-center justify-center ring-1 ring-border/50`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-xl opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <feature.icon className={`h-7 w-7 ${feature.iconColor} relative z-10`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="max-w-4xl mx-auto relative">
            {/* Gradient background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 blur-3xl -z-10" />
            
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur">
              {/* Top gradient border effect */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <CardContent className="p-8 md:p-12 lg:p-16 text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                    {t('landing.cta.title')}
                  </h2>
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    {t('landing.cta.subtitle')}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link href="/register">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto text-base h-12 px-8 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/25" 
                      data-testid="button-cta-signup"
                    >
                      {t('landing.cta.button')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer id="about" className="border-t border-border/40 mt-16 backdrop-blur">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            {/* Main Footer Content */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              {/* Brand Column */}
              <div className="col-span-2 md:col-span-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-lg blur-sm opacity-50" />
                    <CheckCircle2 className="relative h-6 w-6 text-primary" />
                  </div>
                  <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {t('landing.title')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('landing.hero.subtitle')}
                </p>
              </div>

              {/* Product Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('landing.footer.product.title')}</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-features">
                      {t('landing.footer.product.features')}
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-pricing">
                      {t('landing.footer.product.pricing')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-security">
                      {t('landing.footer.product.security')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-roadmap">
                      {t('landing.footer.product.roadmap')}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Company Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('landing.footer.company.title')}</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-about">
                      {t('landing.footer.company.about')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-blog">
                      {t('landing.footer.company.blog')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-careers">
                      {t('landing.footer.company.careers')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-contact">
                      {t('landing.footer.company.contact')}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('landing.footer.resources.title')}</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-documentation">
                      {t('landing.footer.resources.documentation')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-support">
                      {t('landing.footer.resources.support')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-community">
                      {t('landing.footer.resources.community')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-status">
                      {t('landing.footer.resources.status')}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">{t('landing.footer.legal.title')}</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-privacy">
                      {t('landing.footer.legal.privacy')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">
                      {t('landing.footer.legal.terms')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-cookies">
                      {t('landing.footer.legal.cookies')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  {t('landing.footer.copyright')}
                </p>
                <div className="flex items-center gap-4">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
