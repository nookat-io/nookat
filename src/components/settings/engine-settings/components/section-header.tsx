import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  className?: string;
}

export const SectionHeader = ({
  icon: Icon,
  title,
  className = '',
}: SectionHeaderProps) => {
  return (
    <h3
      className={`text-lg font-semibold flex items-center gap-2 ${className}`}
    >
      <Icon className="h-4 w-4" />
      {title}
    </h3>
  );
};
