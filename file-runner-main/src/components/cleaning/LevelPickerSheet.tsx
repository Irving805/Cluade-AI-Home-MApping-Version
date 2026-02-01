import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Check, LucideIcon } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface LevelOption {
  value: number;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface LevelPickerSheetProps {
  // Display
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  pickerTitle?: string;
  
  // Options
  options: LevelOption[];
  
  // State
  value: number;
  onChange: (value: number) => void;
  
  // Optional
  disabled?: boolean;
  className?: string;
}

export function LevelPickerSheet({
  title,
  subtitle,
  icon: Icon,
  pickerTitle,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: LevelPickerSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);
  
  // Find current selection label
  const currentOption = options.find(o => o.value === value);
  
  // Auto-scroll to selected on open
  useEffect(() => {
    if (isOpen && selectedRef.current) {
      // Small delay to ensure drawer is fully rendered
      const timeoutId = setTimeout(() => {
        selectedRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  return (
    <>
      {/* Collapsed Row - Premium iOS Settings Style */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-3 sm:gap-4",
          "p-4 rounded-xl border-2",
          "bg-white dark:bg-slate-900",
          "min-h-[60px]",
          "transition-all duration-200",
          "active:scale-[0.98]",
          disabled
            ? "opacity-50 cursor-not-allowed border-muted"
            : "border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:shadow-md cursor-pointer",
          className
        )}
      >
        {/* Icon Badge */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          "bg-primary/10 dark:bg-primary/20"
        )}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        
        {/* Text Content */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
        
        {/* Current Value + Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-primary">
            {currentOption?.label || 'Select'}
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>
      
      {/* Bottom Sheet Picker */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh] rounded-t-3xl">
          {/* Custom Drag Handle (overrides default) */}
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mt-3 mb-2" />
          
          {/* Title */}
          <DrawerHeader className="text-center pb-3 pt-1">
            <DrawerTitle className="text-lg font-semibold">
              {pickerTitle || title}
            </DrawerTitle>
          </DrawerHeader>
          
          {/* Options List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[60vh]">
            <div className="space-y-2">
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between",
                      "p-4 rounded-xl border-2",
                      "min-h-[56px]",
                      "transition-all duration-150",
                      "active:scale-[0.98]",
                      isSelected
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-transparent bg-muted/30 hover:bg-muted/50 dark:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={cn(
                        "font-medium text-left",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span className={cn(
                          "text-xs shrink-0",
                          isSelected 
                            ? "text-primary/70" 
                            : "text-muted-foreground"
                        )}>
                          {option.sublabel}
                        </span>
                      )}
                      {option.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium shrink-0">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* iOS Safe Area Padding */}
          <div className="pb-safe min-h-[20px]" />
        </DrawerContent>
      </Drawer>
    </>
  );
}
