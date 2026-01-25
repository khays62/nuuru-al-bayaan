import React from 'react';
import { cn } from '../../utils/cn';
import Label from './Label.jsx';

export default function FormField({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  className = '',
  labelClassName = '',
  children,
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <Label className={cn('text-xs text-slate-600', labelClassName)} htmlFor={htmlFor}>
          {label}{required ? <span className="text-red-600"> *</span> : null}
        </Label>
      ) : null}

      {children}

      {error ? <div className="text-xs text-red-600">{error}</div> : null}
      {!error && hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}
