'use client';

import * as React from 'react';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import './select-field.css';

/** Small, explicit compatibility event for existing event.target.value handlers. */
export type SelectFieldChangeEvent = {
  target: { value: string; name: string; id: string };
  currentTarget: { value: string; name: string; id: string };
};
export interface SelectFieldProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'children'> {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: SelectFieldChangeEvent) => void;
  children?: React.ReactNode;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

type Option = { value: string; label: React.ReactNode; text: string; disabled: boolean; hidden: boolean; group?: string };
function plainText(node: React.ReactNode): string {
  return React.Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return plainText(child.props.children);
    return '';
  }).join('');
}
function readOptions(children: React.ReactNode, group?: string, parentDisabled = false): Option[] {
  const result: Option[] = [];
  React.Children.forEach(children, child => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement> & { children?: React.ReactNode; label?: string }>(child)) return;
    if (child.type === React.Fragment) {
      result.push(...readOptions(child.props.children, group, parentDisabled));
    } else if (child.type === 'optgroup') {
      result.push(...readOptions(child.props.children, child.props.label, parentDisabled || !!child.props.disabled));
    } else if (child.type === 'option') {
      const text = child.props.label ?? plainText(child.props.children);
      result.push({
        value: String(child.props.value ?? plainText(child.props.children)),
        label: child.props.label ?? child.props.children,
        text,
        disabled: parentDisabled || !!child.props.disabled,
        hidden: !!child.props.hidden,
        group,
      });
    }
  });
  return result;
}

/**
 * Drop-in for the app's single-value selects. The visible control and popup are
 * entirely Base UI; its hidden form input preserves name/required integration.
 * Arrow keys, typeahead, Escape and focus return are provided by the primitive.
 */
export const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(function SelectField(
  { children, value, defaultValue, onChange, id, name, form, required, disabled, readOnly,
    autoComplete, placeholder, className = '', type: _type, ...triggerProps }, ref,
) {
  const options = React.useMemo(() => readOptions(children), [children]);
  const initial = defaultValue === undefined
    ? options.find(option => !option.disabled && !option.hidden)?.value ?? null
    : String(defaultValue);
  const selectedValue = value === undefined ? undefined : String(value);
  return (
    <Select.Root<string>
      id={id}
      name={name}
      form={form}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={autoComplete}
      value={selectedValue}
      defaultValue={initial}
      items={options.map(({ value: optionValue, label }) => ({ value: optionValue, label }))}
      onValueChange={next => {
        if (next === null) return;
        const target = { value: next, name: name ?? '', id: id ?? '' };
        onChange?.({ target, currentTarget: target });
      }}
    >
      <Select.Trigger
        {...triggerProps}
        ref={ref}
        id={id}
        type="button"
        className={`select-field ${className}`}
        aria-required={required || undefined}
      >
        <Select.Value className="select-field-value" placeholder={placeholder ?? 'Select an option'} />
        <Select.Icon className="select-field-chevron"><ChevronDown size={14} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="select-field-positioner" sideOffset={5} align="start" alignItemWithTrigger={false}>
          <Select.Popup className="select-field-popup">
            <Select.List className="select-field-list">
              {options.filter(option => !option.hidden).map((option, index, shown) => (
                <React.Fragment key={`${option.value}-${index}`}>
                  {option.group && shown[index - 1]?.group !== option.group && (
                    <div className="select-field-group-label" role="presentation">{option.group}</div>
                  )}
                  <Select.Item value={option.value} disabled={option.disabled} className="select-field-option">
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="select-field-check"><Check size={14} /></Select.ItemIndicator>
                  </Select.Item>
                </React.Fragment>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
});
