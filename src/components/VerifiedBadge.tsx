import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <BadgeCheck 
      className={cn("w-4 h-4 text-sky-500 fill-sky-500 text-white shrink-0", className)} 
      strokeWidth={2.5}
    />
  );
}
