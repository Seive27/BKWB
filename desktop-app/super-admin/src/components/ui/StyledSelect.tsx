import React from 'react';
import { ChevronDown } from 'lucide-react';

type StyledSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

/**
 * Native <select> with a custom chevron so filters match the rest of the UI
 * instead of showing OS-native dual-arrow chrome.
 */
const StyledSelect: React.FC<StyledSelectProps> = ({
  className = '',
  wrapperClassName = '',
  children,
  ...props
}) => (
  <div className={`relative ${wrapperClassName}`.trim()}>
    <select
      {...props}
      className={`appearance-none pl-3 pr-10 ${className}`.trim()}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  </div>
);

export default StyledSelect;
