import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type OptionItem = {
  kind: 'option';
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type GroupItem = {
  kind: 'group';
  label: string;
};

type MenuItem = OptionItem | GroupItem;

type StyledSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'size'
> & {
  wrapperClassName?: string;
  children?: React.ReactNode;
  /** Align the menu to the right edge of the trigger (default: left). */
  menuAlign?: 'left' | 'right';
};

function extractMenuItems(children: React.ReactNode): MenuItem[] {
  const items: MenuItem[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === React.Fragment) {
      items.push(...extractMenuItems((child.props as { children?: React.ReactNode }).children));
      return;
    }

    if (child.type === 'optgroup') {
      const props = child.props as { label?: string; children?: React.ReactNode };
      if (props.label) {
        items.push({ kind: 'group', label: props.label });
      }
      items.push(...extractMenuItems(props.children));
      return;
    }

    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      items.push({
        kind: 'option',
        value: props.value === undefined || props.value === null ? '' : String(props.value),
        label: props.children,
        disabled: Boolean(props.disabled),
      });
    }
  });

  return items;
}

/**
 * Custom dropdown styled like the Users "All Roles" filter.
 * Keeps a native-<select>-compatible API (value + onChange with e.target.value)
 * so existing call sites can pass <option> / <optgroup> children unchanged.
 */
const StyledSelect: React.FC<StyledSelectProps> = ({
  className = '',
  wrapperClassName = '',
  children,
  value,
  onChange,
  disabled,
  title,
  id,
  name,
  menuAlign = 'left',
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(() => extractMenuItems(children), [children]);
  const options = useMemo(
    () => menuItems.filter((item): item is OptionItem => item.kind === 'option'),
    [menuItems]
  );
  const selectedValue = value === undefined || value === null ? '' : String(value);
  const selected = options.find((option) => option.value === selectedValue);
  const displayLabel = selected?.label ?? '\u00A0';

  const isFullWidth =
    wrapperClassName.includes('w-full') || className.includes('w-full');

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const emitChange = (nextValue: string) => {
    if (!onChange) return;
    const event = {
      target: { value: nextValue, name: name ?? '' },
      currentTarget: { value: nextValue, name: name ?? '' },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`.trim()}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel ?? title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex items-center justify-between gap-2 px-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      >
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg ${
            isFullWidth
              ? 'left-0 right-0 flex flex-col'
              : `left-0 inline-flex w-max flex-col ${menuAlign === 'right' ? '!left-auto right-0' : ''}`
          }`}
        >
          {menuItems.map((item, index) => {
            if (item.kind === 'group') {
              return (
                <div
                  key={`group-${item.label}-${index}`}
                  className="whitespace-nowrap px-4 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                >
                  {item.label}
                </div>
              );
            }

            const isSelected = item.value === selectedValue;
            return (
              <button
                key={`${item.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={item.disabled}
                onClick={() => {
                  emitChange(item.value);
                  setOpen(false);
                }}
                className={`whitespace-nowrap px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg disabled:cursor-not-allowed disabled:opacity-40 ${
                  isFullWidth ? 'w-full' : ''
                } ${
                  isSelected
                    ? 'bg-primary-50 font-medium text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StyledSelect;
