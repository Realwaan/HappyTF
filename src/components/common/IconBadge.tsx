'use client';

import React from 'react';
import { 
  Zap, 
  Rocket, 
  Kanban, 
  Target, 
  Palette, 
  Briefcase, 
  Flame, 
  BarChart2, 
  Globe, 
  Lightbulb, 
  Shield, 
  FolderKanban, 
  Boxes, 
  Layers, 
  GitBranch,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Sparkles,
  LucideIcon
} from 'lucide-react';

export interface IconBadgeProps {
  nameOrEmoji?: string;
  size?: number;
  className?: string;
  color?: string;
  variant?: 'solid' | 'subtle' | 'plain';
}

const ICON_MAP: Record<string, LucideIcon> = {
  // Emojis mapping to vector icons
  '⚡': Zap,
  '🚀': Rocket,
  '📋': Kanban,
  '🎯': Target,
  '🎨': Palette,
  '💼': Briefcase,
  '🔥': Flame,
  '📊': BarChart2,
  '🌐': Globe,
  '💡': Lightbulb,
  '🛡️': Shield,
  '🛡': Shield,
  '✨': Sparkles,

  // Named keys
  zap: Zap,
  rocket: Rocket,
  kanban: Kanban,
  target: Target,
  palette: Palette,
  briefcase: Briefcase,
  flame: Flame,
  chart: BarChart2,
  globe: Globe,
  idea: Lightbulb,
  shield: Shield,
  folder: FolderKanban,
  boxes: Boxes,
  layers: Layers,
  git: GitBranch,
  grid: LayoutGrid,
  check: CheckCircle2,
  clock: Clock,
  sparkles: Sparkles,
};

export const AVAILABLE_ICONS = [
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'zap', label: 'Velocity', icon: Zap },
  { id: 'target', label: 'Milestone', icon: Target },
  { id: 'palette', label: 'Design', icon: Palette },
  { id: 'briefcase', label: 'Strategy', icon: Briefcase },
  { id: 'folder', label: 'Projects', icon: FolderKanban },
  { id: 'layers', label: 'Backlog', icon: Layers },
  { id: 'shield', label: 'Security', icon: Shield },
  { id: 'git', label: 'DevOps', icon: GitBranch },
  { id: 'chart', label: 'Analytics', icon: BarChart2 },
  { id: 'boxes', label: 'Components', icon: Boxes },
];

export const IconBadge: React.FC<IconBadgeProps> = ({
  nameOrEmoji = 'kanban',
  size = 16,
  className = '',
  color,
  variant = 'plain',
}) => {
  const IconComponent = ICON_MAP[nameOrEmoji] || Kanban;

  if (variant === 'plain') {
    return (
      <IconComponent
        size={size}
        className={className}
        style={{ color: color || 'currentColor' }}
      />
    );
  }

  const badgeBg = color ? `${color}18` : 'rgba(62, 207, 142, 0.12)';
  const badgeBorder = color ? `${color}35` : 'rgba(62, 207, 142, 0.25)';
  const iconColor = color || 'var(--primary)';

  return (
    <div
      className={`icon-badge-box ${className}`}
      style={{
        backgroundColor: badgeBg,
        borderColor: badgeBorder,
        width: size * 1.75,
        height: size * 1.75,
        minWidth: size * 1.75,
        minHeight: size * 1.75,
      }}
    >
      <IconComponent size={size} style={{ color: iconColor }} />
      <style jsx>{`
        .icon-badge-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid;
          flex-shrink: 0;
          transition: all var(--transition-fast);
        }
      `}</style>
    </div>
  );
};
