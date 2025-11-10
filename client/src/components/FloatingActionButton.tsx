import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

interface FloatingActionButtonProps {
  onClick?: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className = '' }: FloatingActionButtonProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: go to dashboard and focus the input
      setLocation('/dashboard');
      setTimeout(() => {
        const inboxInput = document.querySelector<HTMLInputElement>('[data-inbox-add-task]');
        inboxInput?.focus();
      }, 500); // Increased timeout to ensure navigation completes
    }
  };

  return (
    <div className={`floating-action bottom-6 right-6 ${className}`}>
      <Button
        onClick={handleClick}
        size="lg"
        className="w-14 h-14 rounded-full shadow-2xl bg-gradient-primary hover:shadow-3xl transition-all duration-300 group border-2 border-white/20"
        aria-label={t('common.add')}
      >
        <div className="relative">
          <Plus className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-90" />
          <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </div>
      </Button>

      {/* Subtle shadow ring effect */}
      <div className="absolute inset-0 rounded-full bg-primary/20 opacity-50"></div>
    </div>
  );
}
