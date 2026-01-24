import React from 'react';
import { cn } from '../../utils/cn';

export default function Separator({ className = '', ...rest }) {
  return <hr className={cn('border-slate-200', className)} {...rest} />;
}
