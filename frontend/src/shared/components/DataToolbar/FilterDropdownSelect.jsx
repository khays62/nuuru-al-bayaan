import React from 'react';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import DropdownSelect from '../ui/DropdownSelect.jsx';

/**
 * FilterDropdownSelect
 * - Single-select dropdown intended for filter toolbars.
 * - Uses the shared SearchableSelect primitive to keep dropdown UX consistent:
 *   - default view shows up to maxVisible options
 *   - shows "Type to search more…" hint when more options exist
 */
export default function FilterDropdownSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  placeholder = 'Select…',
  id,
  name,
  searchable = false,
  maxVisible = 5,
  searchPlaceholder = 'Type to search…',
  maxHeightClassName = 'max-h-64',
  hideSelectedOption = true,
  buttonProps,
}) {
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
        placeholder={placeholder}
        maxVisible={maxVisible}
        searchPlaceholder={searchPlaceholder}
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
      placeholder={placeholder}
      maxHeightClassName={maxHeightClassName}
      hideSelectedOption={hideSelectedOption}
      buttonProps={buttonProps || {}}
    />
  );
}
