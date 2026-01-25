import React from 'react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Shared filter layout helpers.
 *
 * Goal: keep filter controls consistent across pages (mobile stacked, desktop inline).
 * Visual style of controls comes from shared primitives (Select/Dropdown/SearchableSelect).
 */
export function FilterRow({ children, className = '', align = 'center', ...props }) {
  const alignClass =
    align === 'start'
      ? 'sm:items-start'
      : align === 'end'
        ? 'sm:items-end'
        : 'sm:items-center';

  return (
    <div
      className={cx('w-full flex flex-col sm:flex-row sm:flex-wrap gap-2', alignClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function FilterItem({ children, className = '', minWidthClass = '', grow = false }) {
  return (
    <div className={cx('w-full sm:w-auto', grow ? 'sm:flex-1' : '', minWidthClass, className)}>
      {children}
    </div>
  );
}
