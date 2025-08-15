import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SuccessCardProps {
  onRetry: () => void;
}

export const SuccessCard = ({ onRetry }: SuccessCardProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <CheckCircle className="h-5 w-5" />
            Engine Ready!
          </CardTitle>
          <CardDescription>
            Colima engine has been successfully started and configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Engine is ready to use</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Docker commands are now available and Colima VM is running with
              your specified configuration.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Continue to App
            </Button>
            <Button onClick={onRetry} variant="outline">
              Start Another Engine
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ErrorCardProps {
  error: string | null;
  onRetry: () => void;
}

export const ErrorCard = ({ error, onRetry }: ErrorCardProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            Operation Failed
          </CardTitle>
          <CardDescription>
            There was an error during the process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error Details</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error || 'An unexpected error occurred.'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
            <Button onClick={onRetry}>Retry Operation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
