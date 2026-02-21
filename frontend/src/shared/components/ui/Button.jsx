import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'border-(--nb-color-brand) bg-(--nb-color-bg-card) text-(--nb-color-brand) hover:bg-(--nb-color-brand-50)',
  outline: 'border-(--nb-color-brand) bg-(--nb-color-bg-card) text-(--nb-color-brand) hover:bg-(--nb-color-brand-50)',
  brand: 'border-(--nb-color-brand) bg-(--nb-color-brand) text-white hover:opacity-95',
  neutral: 'border-(--nb-color-border) bg-(--nb-color-bg-card) text-(--nb-color-fg) hover:bg-(--nb-color-bg)',
  danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
  info: 'border-(--nb-color-accent-200) bg-(--nb-color-accent-50) text-(--nb-color-brand) hover:bg-(--nb-color-accent-100)',
};

const sizes = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
};

/**
 * Shared Button primitive.
 * - Non-breaking: existing pages can keep using ActionButton.
 * - Supports `as` for links (e.g. react-router Link).
 */
const Button = React.forwardRef(function Button(
  {
    as: Component = 'button',
    type = 'button',
    variant = 'neutral',
    size = 'md',
    icon,
    iconPosition = 'left',
    className = '',
    disabled = false,
    title,
    onClick,
    children,
    ...rest
  },
  ref
) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md border shadow-sm whitespace-nowrap ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed';

  const isButton = Component === 'button';

  const handleClick = (e) => {
    if (disabled && !isButton) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  const componentProps = {
    ref,
    title,
    onClick: handleClick,
    className: cn(base, sizes[size] || sizes.md, variants[variant] || variants.neutral, className),
    ...rest,
  };

  if (isButton) componentProps.type = type;
  if (disabled) {
    if (isButton) componentProps.disabled = true;
    else {
      componentProps['aria-disabled'] = true;
      componentProps.tabIndex = -1;
    }
  }

  return (
    <Component {...componentProps}>
      {icon && iconPosition === 'left' ? <span className="shrink-0">{icon}</span> : null}
      {children}
      {icon && iconPosition === 'right' ? <span className="shrink-0">{icon}</span> : null}
    </Component>
  );
});

export default Button;
