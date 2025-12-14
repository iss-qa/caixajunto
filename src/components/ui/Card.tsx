import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6',
  };

  const Component = hover ? motion.div : 'div';

  return (
    <Component
      className={cn(
        hover ? 'card-hover cursor-pointer' : 'card',
        paddingClasses[padding],
        className
      )}
      onClick={onClick}
      {...(hover && {
        whileHover: { y: -4 },
        whileTap: { scale: 0.98 },
      })}
    >
      {children}
    </Component>
  );
}

