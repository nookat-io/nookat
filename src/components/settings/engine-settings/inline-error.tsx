import { AlertCircle } from 'lucide-react';

interface InlineErrorProps {
  error: string | null;
}

export const InlineError = ({ error }: InlineErrorProps) => {
  if (!error) return null;

  return (
    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="text-sm font-medium text-red-800 dark:text-red-200">
            Installation Failed
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      </div>
    </div>
  );
};
