import React from 'react';
import { cn } from '../../utils/cn';

export default function Skeleton({ className = '', ...rest }) {
  return <div className={cn('animate-pulse rounded-(--nb-radius-sm) bg-slate-200/80', className)} {...rest} />;
}
