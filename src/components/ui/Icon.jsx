import React from 'react';
import * as LucideIcons from 'lucide-react';

const Icon = ({ name, size = 20, color = 'currentColor', className = '' }) => {
  if (!name) return null;
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) {
    const HelpCircle = LucideIcons['HelpCircle'];
    return <HelpCircle size={size} color={color} className={className} />;
  }
  return <LucideIcon size={size} color={color} className={className} />;
};

export default Icon;
