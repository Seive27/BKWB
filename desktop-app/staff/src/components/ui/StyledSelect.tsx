import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
  /** Show a text field that filters the dropdown options. */
  searchable?: boolean;
  /** Placeholder shown while the searchable field is open and empty. */
  searchPlaceholder?: string;
};

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

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
  searchable = false,
  searchPlaceholder = 'Search…',
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useRef(`styled-select-${Math.random().toString(36).slice(2, 9)}`).current;

  const menuItems = useMemo(() => extractMenuItems(children), [children]);
  const options = useMemo(
    () => menuItems.filter((item): item is OptionItem => item.kind === 'option'),
    [menuItems]
  );
  const selectedValue = value === undefined || value === null ? '' : String(value);
  const selected = options.find((option) => option.value === selectedValue);
  const displayLabel = selected?.label ?? '\u00A0';
  const closedPlaceholder =
    nodeText(options.find((option) => option.value === '')?.label) || 'Select…';

  const visibleItems = useMemo(() => {
    if (!searchable) return menuItems;

    const normalizedQuery = query.trim().toLowerCase();
    const result: MenuItem[] = [];
    let currentGroup: GroupItem | null = null;
    let groupInserted = false;

    for (const item of menuItems) {
      if (item.kind === 'group') {
        currentGroup = item;
        groupInserted = false;
        continue;
      }
      if (!item.value) continue;

      const label = nodeText(item.label).toLowerCase();
      if (normalizedQuery && !label.includes(normalizedQuery)) continue;

      if (currentGroup && !groupInserted) {
        result.push(currentGroup);
        groupInserted = true;
      }
      result.push(item);
    }

    return result;
  }, [menuItems, query, searchable]);

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

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const emitChange = (nextValue: string) => {
    if (!onChange) return;
    const event = {
      target: { value: nextValue, name: name ?? '' },
      currentTarget: { value: nextValue, name: name ?? '' },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  const shellClassName = searchable
    ? className.replace(/\bfocus:/g, 'focus-within:')
    : className;

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`.trim()}>
      {searchable ? (
        <div
          className={`flex items-center gap-2 text-left ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          } ${shellClassName}`.trim()}
          onMouseDown={(event) => {
            if (disabled) return;
            const target = event.target as HTMLElement;
            if (target.closest('button') || target === searchRef.current) return;
            event.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
            autoComplete="off"
            disabled={disabled}
            title={title}
            aria-label={ariaLabel ?? title}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={focused ? query : selected && selected.value ? nodeText(selected.label) : ''}
            placeholder={focused ? searchPlaceholder : closedPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (disabled) return;
              setFocused(true);
              setQuery('');
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false);
                event.currentTarget.blur();
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                const firstMatch = visibleItems.find(
                  (item): item is OptionItem => item.kind === 'option' && !item.disabled
                );
                if (firstMatch && query.trim()) {
                  emitChange(firstMatch.value);
                  setOpen(false);
                }
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label="Toggle options"
            onMouseDown={(event) => {
              event.preventDefault();
              if (!disabled) setOpen((prev) => !prev);
            }}
            className="flex-shrink-0 text-gray-400 disabled:cursor-not-allowed"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      ) : (
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
      )}

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg ${
            isFullWidth
              ? 'left-0 right-0 flex flex-col'
              : `left-0 inline-flex w-max flex-col ${menuAlign === 'right' ? '!left-auto right-0' : ''}`
          }`}
        >
          {searchable && visibleItems.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
          )}
          {(searchable ? visibleItems : menuItems).map((item, index) => {
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
                className={`px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg disabled:cursor-not-allowed disabled:opacity-40 ${
                  searchable ? 'w-full whitespace-normal' : 'whitespace-nowrap'
                } ${isFullWidth ? 'w-full' : ''} ${
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
