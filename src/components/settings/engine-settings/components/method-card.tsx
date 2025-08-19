import { LucideIcon, AlertTriangle } from 'lucide-react';
import { InfoBanner } from './info-banner';

interface MethodCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string;
  isSelected: boolean;
  isDisabled?: boolean;
  isChecking?: boolean;
  warning?: string;
  onClick: () => void;
}

export const MethodCard = ({
  icon: Icon,
  title,
  description,
  details,
  isSelected,
  isDisabled = false,
  isChecking = false,
  warning,
  onClick,
}: MethodCardProps) => {
  const getCardStyles = () => {
    if (isDisabled) {
      return 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed';
    }

    if (isSelected) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 cursor-pointer';
    }

    return 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer';
  };

  return (
    <div
      className={`p-4 border-2 rounded-lg transition-colors ${getCardStyles()}`}
      onClick={!isDisabled ? onClick : undefined}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">{details}</div>

      {isChecking && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-transparent" />
          Checking availability...
        </div>
      )}

      {warning && (
        <div className="mt-3">
          <InfoBanner
            icon={AlertTriangle}
            title="Not available"
            message={warning}
            variant="warning"
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
};
