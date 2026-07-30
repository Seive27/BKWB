import React from 'react';

interface AuthOverlayProps {
  visible: boolean;
  fading: boolean;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ visible, fading }) => {
  if (!visible && !fading) return null;

  return (
    <div
      className={`
        fixed inset-0 z-40 bg-black/55
        transition-opacity duration-300 ease-out
        ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
      aria-hidden="true"
    />
  );
};

export default AuthOverlay;
