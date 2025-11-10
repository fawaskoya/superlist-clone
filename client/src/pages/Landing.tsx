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
  Play,
  Star,
  ChevronRight,
  Target,
  Workflow,
  Brain,
  Shield,
  Rocket,
  Layers,
  Heart,
  TrendingUp,
  Calendar,
  Clock,
  CheckSquare,
  Plus,
} from 'lucide-react';
import heroImage from '@assets/generated_images/Task_management_hero_image_47e8160b.png';
import { useEffect, useState } from 'react';

// Animated Background Component
function AnimatedBackground() {
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/10 animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${10 + particle.delay}s`,
          }}
        />
      ))}

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
    </div>
  );
}

// Floating Card Component
function FloatingCard({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  return (
    <div
      className="animate-float-subtle"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// Interactive Demo Component
function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('tasks');

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'projects', label: 'Projects', icon: Target },
  ];

  const demoContent = {
    tasks: [
      { id: 1, text: 'Design new landing page', completed: true, priority: 'high' },
      { id: 2, text: 'Review user feedback', completed: false, priority: 'medium' },
      { id: 3, text: 'Update documentation', completed: false, priority: 'low' },
      { id: 4, text: 'Team standup meeting', completed: false, priority: 'high' },
    ],
    calendar: [
      { id: 1, text: 'Product review call', time: '10:00 AM', type: 'meeting' },
      { id: 2, text: 'Design workshop', time: '2:00 PM', type: 'workshop' },
      { id: 3, text: 'Client presentation', time: '4:30 PM', type: 'presentation' },
    ],
    projects: [
      { id: 1, name: 'Website Redesign', progress: 85, color: 'bg-blue-500' },
      { id: 2, name: 'Mobile App', progress: 60, color: 'bg-emerald-500' },
      { id: 3, name: 'API Integration', progress: 30, color: 'bg-purple-500' },
    ],
  };

  return (
    <div className="relative max-w-md mx-auto">
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">TaskFlow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {activeTab === 'tasks' && demoContent.tasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-accent/50 ${
                task.completed ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20' : 'bg-card border-border/50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                task.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-muted-foreground hover:border-primary'
              }`}>
                {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.text}
              </span>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {task.priority}
              </Badge>
            </div>
          ))}

          {activeTab === 'calendar' && demoContent.calendar.map((event, index) => (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-all"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-2 h-8 bg-primary rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium">{event.text}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
              <Badge variant="outline" className="text-xs capitalize">
                {event.type}
              </Badge>
            </div>
          ))}

          {activeTab === 'projects' && demoContent.projects.map((project, index) => (
            <div
              key={project.id}
              className="p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-all space-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${project.color} transition-all duration-1000`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Smart task prioritization and automated suggestions to boost your productivity.',
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
      delay: 0,
    },
    {
      icon: Workflow,
      title: 'Seamless Workflows',
      description: 'Connect your tools and automate repetitive tasks with powerful integrations.',
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      iconBg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
      delay: 0.1,
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance standards to keep your data safe.',
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-500',
      delay: 0.2,
    },
    {
      icon: Rocket,
      title: 'Lightning Fast',
      description: 'Optimized for speed with real-time sync across all your devices.',
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      iconBg: 'bg-gradient-to-br from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-500',
      delay: 0.3,
    },
    {
      icon: Heart,
      title: 'User-Centric Design',
      description: 'Beautiful, intuitive interface designed with your experience in mind.',
      gradient: 'from-rose-500 via-pink-500 to-purple-500',
      iconBg: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-500',
      delay: 0.4,
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Deep insights into your productivity patterns and team performance.',
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      iconBg: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
      iconColor: 'text-indigo-500',
      delay: 0.5,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      company: 'TechCorp',
      avatar: 'SC',
      quote: 'TaskFlow transformed how our team collaborates. The AI suggestions are incredibly accurate.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Startup Founder',
      company: 'InnovateLab',
      avatar: 'MJ',
      quote: 'Finally, a task management tool that understands context. Game-changer for productivity.',
      rating: 5,
    },
    {
      name: 'Emma Rodriguez',
      role: 'Team Lead',
      company: 'DesignStudio',
      avatar: 'ER',
      quote: 'The visual interface makes complex workflows feel simple. Our efficiency doubled.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop & Tablet Navigation */}
            <div className="hidden sm:flex h-16 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-xl p-2">
                    <CheckSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  TaskFlow
                </span>
              </div>

              {/* Navigation Links */}
              <div className="flex items-center gap-4 md:gap-6 flex-1 justify-center">
                <a href="#home" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap relative group">
                  Home
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 group-hover:w-full transition-all duration-300" />
                </a>
                <a href="#demo" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap relative group">
                  Demo
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 group-hover:w-full transition-all duration-300" />
                </a>
                <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap relative group">
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 group-hover:w-full transition-all duration-300" />
                </a>
                <a href="#testimonials" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap relative group">
                  Reviews
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 group-hover:w-full transition-all duration-300" />
                </a>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LanguageSwitcher />
                <Link href="/login">
                  <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-all duration-300">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:from-primary/90 hover:via-purple-500 hover:to-pink-400 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex sm:hidden flex-col">
              <div className="flex h-14 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-lg blur opacity-75" />
                    <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-lg p-1.5">
                      <CheckSquare className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    TaskFlow
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <Link href="/register">
                    <Button size="sm" className="bg-gradient-to-r from-primary to-purple-600">
                      Start Free
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-4 pb-2 overflow-x-auto">
                <a href="#home" className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">Home</a>
                <a href="#demo" className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">Demo</a>
                <a href="#features" className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">Features</a>
                <a href="#testimonials" className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">Reviews</a>
                <a href="/login" className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">Sign In</a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="home" className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="max-w-7xl mx-auto text-center space-y-12">
            {/* Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <FloatingCard delay={0.2}>
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">Task completed!</span>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard delay={0.8}>
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl ml-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">New project started</span>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard delay={1.4}>
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl -ml-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">AI insights ready</span>
                  </div>
                </div>
              </FloatingCard>
            </div>

            {/* Main Hero Content */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 rounded-full text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>✨ AI-Powered Task Management</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                  Manage Tasks
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Like a Pro
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Transform your productivity with AI-powered task management that adapts to your workflow.
                Intelligent suggestions, seamless collaboration, and beautiful design.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Link href="/register">
                <Button
                  size="lg"
                  className="group w-full sm:w-auto text-lg h-14 px-8 bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:from-primary/90 hover:via-purple-500 hover:to-pink-400 shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/30 transition-all duration-500 transform hover:scale-105"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                className="group w-full sm:w-auto text-lg h-14 px-8 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:bg-primary/5"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">4.9/5</span>
                  <span>from 2,000+ users</span>
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>10,000+ tasks managed daily</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section id="demo" className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-full text-sm font-medium text-blue-600 dark:text-blue-400">
                <Layers className="h-4 w-4" />
                Interactive Demo
              </div>

              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                See TaskFlow in Action
              </h2>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Experience the power of intelligent task management with our interactive demo
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-2xl sm:text-3xl font-bold">
                    Everything you need, beautifully organized
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    TaskFlow combines the best of task management with cutting-edge AI to help you stay productive and organized.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Smart Task Organization</h4>
                      <p className="text-muted-foreground">Automatically categorize and prioritize your tasks with AI insights.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Seamless Collaboration</h4>
                      <p className="text-muted-foreground">Share projects and tasks with your team in real-time.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Advanced Analytics</h4>
                      <p className="text-muted-foreground">Track your productivity and get insights to improve your workflow.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <InteractiveDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full text-sm font-medium text-purple-600 dark:text-purple-400">
                <Zap className="h-4 w-4" />
                Powerful Features
              </div>

              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                Built for productivity
              </h2>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Every feature designed to help you work smarter, not harder
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FloatingCard key={index} delay={feature.delay}>
                  <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card/50 to-card/80 backdrop-blur-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                    <CardContent className="relative p-8 space-y-6">
                      <div className={`relative h-16 w-16 rounded-2xl ${feature.iconBg} flex items-center justify-center ring-1 ring-border/50 group-hover:ring-primary/30 transition-all duration-300`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                        <feature.icon className={`h-8 w-8 ${feature.iconColor} relative z-10 group-hover:scale-110 transition-transform duration-300`} />
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                          {feature.description}
                        </p>
                      </div>

                      <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Learn more
                        <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-full text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Heart className="h-4 w-4" />
                Loved by Teams
              </div>

              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                Join thousands of productive teams
              </h2>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See what teams are saying about TaskFlow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <FloatingCard key={index} delay={index * 0.2}>
                  <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card/50 to-card/80 backdrop-blur-xl hover:shadow-xl transition-all duration-500">
                    <CardContent className="relative p-8 space-y-6">
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      <blockquote className="text-lg leading-relaxed text-foreground/90">
                        "{testimonial.quote}"
                      </blockquote>

                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {testimonial.avatar}
                        </div>
                        <div>
                          <div className="font-semibold">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FloatingCard>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto relative">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10 animate-pulse" />

            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card/50 to-card/90 backdrop-blur-xl shadow-2xl">
              {/* Animated border */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

              <CardContent className="relative p-12 md:p-16 lg:p-20 text-center space-y-8">
                <div className="space-y-6">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                    Ready to transform your productivity?
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Join thousands of teams already using TaskFlow to stay organized and productive.
                    Start your free trial today.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="group w-full sm:w-auto text-lg h-14 px-8 bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:from-primary/90 hover:via-purple-500 hover:to-pink-400 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 transform hover:scale-105"
                    >
                      Start Free Trial
                      <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>

                  <div className="text-sm text-muted-foreground">
                    No credit card required • 14-day free trial • Cancel anytime
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-background/50 backdrop-blur">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              {/* Brand Column */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-xl blur opacity-75" />
                    <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-xl p-2">
                      <CheckSquare className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    TaskFlow
                  </span>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  The intelligent task management platform that adapts to your workflow and boosts your productivity.
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <span className="text-primary font-semibold text-sm">f</span>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <span className="text-primary font-semibold text-sm">t</span>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <span className="text-primary font-semibold text-sm">in</span>
                  </div>
                </div>
              </div>

              {/* Product Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Product</h3>
                <ul className="space-y-3">
                  <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#demo" className="text-muted-foreground hover:text-primary transition-colors">Demo</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Integrations</a></li>
                </ul>
              </div>

              {/* Company Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Company</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                </ul>
              </div>

              {/* Support Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Support</h3>
                <ul className="space-y-3">
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Community</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Status</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-border/40">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  © 2025 TaskFlow. All rights reserved.
                </p>
                <div className="flex items-center gap-4">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
