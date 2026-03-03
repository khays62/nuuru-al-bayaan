import React from 'react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import DropdownSelect from '../ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

/**
 * FilterDropdownSelect
 * - Single-select dropdown intended for filter toolbars.
 * - Uses the shared SearchableSelect primitive to keep dropdown UX consistent:
 *   - default view shows up to maxVisible options
 *   - shows "Type to search moreâ€¦" hint when more options exist
 */
export default function FilterDropdownSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  placeholder,
  id,
  name,
  searchable = false,
  maxVisible = 5,
  searchPlaceholder,
  maxHeightClassName = 'max-h-64',
  hideSelectedOption = true,
  buttonProps,
}) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.select.placeholder', { defaultValue: 'Selectâ€¦' });
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.select.searchPlaceholder', { defaultValue: 'Type to searchâ€¦' });

  if (searchable) {
    return (
      <SearchableSelect
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        className={className}
        placeholder={resolvedPlaceholder}
        maxVisible={maxVisible}
        searchPlaceholder={resolvedSearchPlaceholder}
        hideSelectedOption={hideSelectedOption}
        buttonProps={buttonProps || {}}
      />
    );
  }

  return (
    <DropdownSelect
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      className={className}
      placeholder={resolvedPlaceholder}
      maxHeightClassName={maxHeightClassName}
      hideSelectedOption={hideSelectedOption}
      buttonProps={buttonProps || {}}
    />
  );
}
