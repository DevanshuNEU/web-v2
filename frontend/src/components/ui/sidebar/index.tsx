import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Sidebar layout component
interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function SidebarLayout({ sidebar, content, className }: SidebarLayoutProps) {
  return (
    <div className="h-full w-full" style={{ backgroundColor: '#faf9f6' }}>
      <div className="h-full flex">
        {/* Sidebar */}
        <div 
          className="border-r border-gray-200 bg-white/80 backdrop-blur-sm overflow-y-auto"
          style={{ width: '20rem', padding: '2rem' }}
        >
          {sidebar}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '2rem' }}>
          <div className={cn("max-w-4xl mx-auto", className)}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar section
interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("", className)} style={{ marginBottom: '2rem' }}>
      <h3 className="text-lg font-semibold text-gray-900" style={{ marginBottom: '1rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Sidebar item
interface SidebarItemProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarItem({ children, isActive = false, onClick, className }: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all rounded-lg border",
        isActive 
          ? 'bg-brand-blue/8 border-brand-blue/30 shadow-sm' 
          : 'bg-white/60 border-gray-200/60 hover:bg-white/80 hover:shadow-md',
        className
      )}
      style={{ padding: '1rem', marginBottom: '0.75rem' }}
    >
      {children}
    </div>
  );
}

// Content card 
interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ContentCard({ children, className, delay = 0 }: ContentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
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
