import { CheckCircle } from 'lucide-react';

interface InlineSuccessProps {
  message: string;
  description: string;
}

export const InlineSuccess = ({ message, description }: InlineSuccessProps) => {
  return (
    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="text-sm font-medium text-green-800 dark:text-green-200">
            {message}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};
