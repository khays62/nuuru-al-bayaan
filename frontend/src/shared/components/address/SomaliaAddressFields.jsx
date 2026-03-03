import React, { useMemo } from 'react';

import Label from '../ui/Label.jsx';
import Input from '../ui/Input.jsx';
import DropdownSelect from '../ui/DropdownSelect.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { getSomaliaDistrictOptions, getSomaliaRegionOptions } from '../../data/somaliaAdminDivisions';

export default function SomaliaAddressFields({
  isSomali,
  regionId,
  districtId,
  neighborhood,
  onChange,
  disabled = false,
  required = true,
  showNationality = true,
  idPrefix = 'address',
  dense = false,
}) {
  const { t, lang } = useI18n();

  const regionOptions = useMemo(() => getSomaliaRegionOptions(lang), [lang]);
  const districtOptions = useMemo(() => getSomaliaDistrictOptions(regionId, lang), [regionId, lang]);

  const nationalityValue = isSomali === false ? 'notSomali' : 'somali';

  const gridClassName = dense
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
    : 'grid grid-cols-1 md:grid-cols-2 gap-6';

  const labelClassName = dense ? 'text-xs' : '';
  const controlClassName = dense ? 'py-1.5' : '';

  return (
    <div className={gridClassName}>
      {showNationality ? (
        <div>
          <Label className={labelClassName}>{t('students.address.nationality.label', { defaultValue: 'Nationality' })}</Label>
          <div className="mt-1">
            <DropdownSelect
              id={`${idPrefix}-nationality`}
              name="isSomali"
              value={nationalityValue}
              onChange={(v) => {
                const nextIsSomali = String(v) !== 'notSomali';
                onChange?.('isSomali', nextIsSomali);
                if (!nextIsSomali) {
                  onChange?.('regionId', '');
                  onChange?.('districtId', '');
                }
              }}
              options={[
                { value: 'somali', label: t('students.address.nationality.somali', { defaultValue: 'Somali' }) },
                { value: 'notSomali', label: t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' }) },
              ]}
              disabled={disabled}
              className={controlClassName}
            />
          </div>
        </div>
      ) : null}

      {isSomali !== false ? (
        <>
          <div>
            <Label className={labelClassName}>{t('students.address.region.label', { defaultValue: 'Region' })}</Label>
            <div className="mt-1">
              <SearchableSelect
                id={`${idPrefix}-region`}
                name="regionId"
                value={regionId || ''}
                onChange={(v) => {
                  onChange?.('regionId', v);
                  onChange?.('districtId', '');
                }}
                options={regionOptions}
                placeholder={t('students.address.region.placeholder', { defaultValue: 'Select region' })}
                disabled={disabled}
                className={controlClassName}
                maxVisible={6}
                searchPlaceholder={t('common.select.searchPlaceholder', { defaultValue: 'Type to searchâ€¦' })}
              />
            </div>
          </div>

          <div>
            <Label className={labelClassName}>{t('students.address.district.label', { defaultValue: 'District' })}</Label>
            <div className="mt-1">
              <SearchableSelect
                id={`${idPrefix}-district`}
                name="districtId"
                value={districtId || ''}
                onChange={(v) => onChange?.('districtId', v)}
                options={districtOptions}
                placeholder={t('students.address.district.placeholder', { defaultValue: 'Select district' })}
                disabled={disabled || !regionId}
                className={controlClassName}
                maxVisible={6}
                searchPlaceholder={t('common.select.searchPlaceholder', { defaultValue: 'Type to searchâ€¦' })}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className={dense ? 'md:col-span-2 xl:col-span-3' : 'md:col-span-2'}>
        <Label className={labelClassName}>{t('students.address.neighborhood.label', { defaultValue: 'Neighborhood' })}</Label>
        <Input
          id={`${idPrefix}-neighborhood`}
          name="neighborhood"
          value={neighborhood || ''}
          onChange={(e) => onChange?.('neighborhood', e.target.value)}
          type="text"
          required={required}
          disabled={disabled}
          className={`mt-1 ${controlClassName}`}
          placeholder={t('students.address.neighborhood.placeholder', { defaultValue: 'e.g. degmada / xaafadda' })}
        />
      </div>
    </div>
  );
}
