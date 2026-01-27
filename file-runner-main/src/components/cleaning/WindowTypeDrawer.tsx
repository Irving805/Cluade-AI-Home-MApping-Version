import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { WINDOW_TYPES, WINDOW_CATEGORIES, WindowCategory, WindowType } from '@/lib/roomWindowConfig';
import { useBooking } from '@/contexts/BookingContext';
import { t } from '@/lib/translations';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { 
  LayoutGrid, Columns2, DoorOpen, Grid2X2, PanelLeftClose, LayoutDashboard,
  ChevronsDown, ChevronsUp, Square, Flower2, RectangleHorizontal, Pentagon,
  CircleDot, Minus, CornerUpRight, Triangle, Hexagon, Octagon, Circle,
  Church, ArrowRightLeft, Columns, Plus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Icon mapping for window types
const windowIconMap: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="w-6 h-6" />,
  Columns2: <Columns2 className="w-6 h-6" />,
  DoorOpen: <DoorOpen className="w-6 h-6" />,
  Grid2X2: <Grid2X2 className="w-6 h-6" />,
  PanelLeftClose: <PanelLeftClose className="w-6 h-6" />,
  LayoutDashboard: <LayoutDashboard className="w-6 h-6" />,
  ChevronsDown: <ChevronsDown className="w-6 h-6" />,
  ChevronsUp: <ChevronsUp className="w-6 h-6" />,
  Square: <Square className="w-6 h-6" />,
  Flower2: <Flower2 className="w-6 h-6" />,
  RectangleHorizontal: <RectangleHorizontal className="w-6 h-6" />,
  Pentagon: <Pentagon className="w-6 h-6" />,
  CircleDot: <CircleDot className="w-6 h-6" />,
  Minus: <Minus className="w-6 h-6" />,
  CornerUpRight: <CornerUpRight className="w-6 h-6" />,
  Triangle: <Triangle className="w-6 h-6" />,
  Hexagon: <Hexagon className="w-6 h-6" />,
  Octagon: <Octagon className="w-6 h-6" />,
  Circle: <Circle className="w-6 h-6" />,
  ChurchIcon: <Church className="w-6 h-6" />,
  ArrowRightLeft: <ArrowRightLeft className="w-6 h-6" />,
  Columns: <Columns className="w-6 h-6" />,
};

interface WindowTypeDrawerProps {
  onSelectType: (typeId: string) => void;
  trigger?: React.ReactNode;
}

export function WindowTypeDrawer({ onSelectType, trigger }: WindowTypeDrawerProps) {
  const { language } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WindowCategory>('standard');

  const windowsByCategory = Object.values(WINDOW_TYPES).reduce((acc, window) => {
    if (!acc[window.category]) acc[window.category] = [];
    acc[window.category].push(window);
    return acc;
  }, {} as Record<WindowCategory, WindowType[]>);

  const handleSelect = (typeId: string) => {
    onSelectType(typeId);
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t(language, 'wintype.add_window') || '+ Add Window Type'}
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh] bg-background z-50">
        <DrawerHeader className="border-b border-border pb-2 px-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-bold">
              {t(language, 'wintype.select_type') || 'Select Window Type'}
            </DrawerTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {/* Category Tabs - Mobile optimized scrolling */}
          <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {WINDOW_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t(language, cat.labelKey) || cat.label}
              </button>
            ))}
          </div>
        </DrawerHeader>

        {/* Window Type Grid - Compact cards */}
        <div className="p-3 overflow-y-auto overscroll-contain max-h-[55vh]">
          <div className="grid grid-cols-3 gap-2">
            {windowsByCategory[selectedCategory]?.map((windowType) => {
              const label = t(language, windowType.labelKey) || windowType.id.replace(/_/g, ' ');
              return (
                <button
                  key={windowType.id}
                  onClick={() => handleSelect(windowType.id)}
                  className={cn(
                    "flex flex-col items-center p-2.5 rounded-xl border-2 transition-all min-h-[95px]",
                    "bg-card hover:border-primary hover:shadow-md active:scale-95",
                    "border-border"
                  )}
                >
                  {/* Icon / Emoji - Smaller */}
                  <div className="text-primary mb-1">
                    {windowIconMap[windowType.icon] ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        {React.cloneElement(windowIconMap[windowType.icon] as React.ReactElement, { className: 'w-5 h-5' })}
                      </div>
                    ) : (
                      <span className="text-lg">{windowType.emoji}</span>
                    )}
                  </div>
                  
                  {/* Label with truncation */}
                  <h5 
                    className="text-[10px] font-semibold text-foreground text-center mb-0.5 line-clamp-1 w-full"
                    title={label}
                  >
                    {label}
                  </h5>
                  
                  {/* Description - Single line */}
                  <p className="text-[9px] text-muted-foreground text-center mb-1 line-clamp-1 w-full">
                    {t(language, windowType.descriptionKey) || windowType.description}
                  </p>
                  
                  {/* Price Badge - Compact */}
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    windowType.pricePerSide >= 8.5
                      ? "bg-amber-500/10 text-amber-600" 
                      : "bg-primary/10 text-primary"
                  )}>
                    ${windowType.pricePerSide}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
