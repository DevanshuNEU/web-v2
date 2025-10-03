'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title?: string;
  className?: string;
  active?: boolean;
}

export function IconButton({ 
  icon: Icon, 
  onClick, 
  title, 
  className = '',
  active = false 
}: IconButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${active 
          ? 'bg-accent/20 text-accent' 
          : 'text-text hover:bg-surface/50'
        }
        ${className}
      `}
    >
      <Icon size={18} />
    </motion.button>
  );
}
