import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminBadgeProps {
  className?: string;
}

export function AdminBadge({ className }: AdminBadgeProps) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 bg-neutral-900 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight shrink-0 shadow-sm", className)}>
      <ShieldCheck className="w-2.5 h-2.5" />
      <span>Admin</span>
    </div>
  );
}
