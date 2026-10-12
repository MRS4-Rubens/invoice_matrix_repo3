'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Crown } from 'lucide-react';
import { canUseTemplate, type BusinessSubscriptionSource } from '@/lib/subscriptions/entitlements';
import { cn } from '@/lib/utils';

export interface TemplateOption {
  id: 'template_1' | 'template_2' | 'template_3' | 'template_4';
  name: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: 'template_1', name: 'Template 1 (Classic Slate)' },
  { id: 'template_2', name: 'Template 2 (Traditional Book Depot)' },
  { id: 'template_3', name: 'Template 3 (Pre-Printed Carbon Pad)' },
  { id: 'template_4', name: 'Template 4 (Modern Book Depot Replica)' },
];

export interface TemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  business: BusinessSubscriptionSource | null | undefined;
  onUpgradeClick: () => void;
  compact?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
}

export function TemplateSelector({
  value,
  onChange,
  business,
  onUpgradeClick,
  compact = false,
  className,
  buttonClassName,
  id,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    TEMPLATE_OPTIONS.find((t) => t.id === value) || TEMPLATE_OPTIONS[0];

  const hasAnyProBadge = TEMPLATE_OPTIONS.some(
    (t) => !canUseTemplate(business, t.id).allowed
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (templateId: string) => {
    const check = canUseTemplate(business, templateId);
    if (!check.allowed) {
      setIsOpen(false);
      onUpgradeClick();
      return;
    }
    onChange(templateId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', compact ? 'w-[135px] sm:w-[150px]' : 'w-full', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center justify-between text-left transition-all cursor-pointer',
          compact
            ? 'w-full rounded-md border border-primary/25 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[0_0_8px_rgba(59,130,246,0.06)] hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40'
            : 'h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-2xs hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600',
          buttonClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate pr-1.5 font-medium">{selectedOption.name}</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full mt-1.5 z-50 rounded-xl border border-slate-200/90 bg-white p-1 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900',
            compact
              ? hasAnyProBadge
                ? 'left-0 sm:left-0 w-[340px] max-w-[92vw]'
                : 'left-0 sm:left-0 w-[280px] max-w-[92vw]'
              : 'left-0 w-full min-w-[340px]'
          )}
        >
          <div className="space-y-0.5">
            {TEMPLATE_OPTIONS.map((t) => {
              const isSelected = t.id === value;
              const isAllowed = canUseTemplate(business, t.id).allowed;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs sm:text-[13px] text-left transition-all cursor-pointer group',
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-950 font-bold dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-200/50 dark:border-indigo-800/40'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  )}
                >
                  <span className="truncate flex-1">{t.name}</span>

                  {!isAllowed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black tracking-wide text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
                      <Crown className="size-2.5 text-amber-500" />
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
