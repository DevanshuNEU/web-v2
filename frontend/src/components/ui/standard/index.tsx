import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// App page wrapper - consistent base layout
interface AppPageProps {
  children: React.ReactNode;
  className?: string;
}

export function AppPage({ children, className }: AppPageProps) {
  return (
    <div className="h-full w-full" style={{ backgroundColor: '#faf9f6' }}>
      <div className="h-full overflow-y-auto" style={{ padding: '2rem', paddingBottom: '4rem' }}>
        <div className={cn("max-w-6xl mx-auto", className)} style={{ gap: '2rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Standard card - used everywhere for consistency
interface StandardCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StandardCard({ children, className, delay = 0 }: StandardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "bg-white/60 backdrop-blur-sm border border-gray-200/60 shadow-lg rounded-xl",
        className
      )}
      style={{ padding: '2rem', marginBottom: '2rem' }}
    >
      {children}
    </motion.div>
  );
}

// Section header within cards
interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <div className={cn("", className)} style={{ marginBottom: '2rem' }}>
      <h3 className="text-2xl font-semibold text-gray-900" style={{ marginBottom: '1.5rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Grid system using rem
interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function Grid({ children, columns = 2, className }: GridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div 
      className={cn("grid auto-rows-fr", gridCols[columns], className)}
      style={{ gap: '1.5rem' }}
    >
      {children}
    </div>
  );
}
