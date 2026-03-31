// ActionButton.jsx
// Qayb guud oo badhamo (icon + qoraal) leh. Variant wuxuu dhigaa class‑yada caadiga ah.
// Contract: { variant?: 'primary'|'neutral'|'danger'|'info', onClick?: Function, title?: string, icon?: ReactNode, children }
import React from 'react';
import Button from './Button.jsx';

/**
 * ActionButton = compat wrapper.
 * Sabab: pages badan ayaa hore u isticmaala ActionButton.
 * Hadda ActionButton gudaha ayuu u isticmaalaa Button primitive si Design System
 * u noqdo hal meel laga xukumo, adigoon pages-ka dhan hal mar taaban.
 */
export default function ActionButton({
  variant = 'neutral',
  size = 'md',
  onClick,
  title,
  icon,
  children,
  className = '',
  disabled = false,
  ...rest
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={title}
      onClick={onClick}
      icon={icon}
      className={className}
      disabled={disabled}
      {...rest}
    >
      {children}
    </Button>
  );
}
