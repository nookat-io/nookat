import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package } from 'lucide-react';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Mark frontend as ready after a short delay
    const frontendTimer = setTimeout(async () => {
      try {
        await invoke('mark_frontend_ready');
      } catch (error) {
        console.error('Failed to mark frontend ready:', error);
      }
    }, 1000);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 5, 100);

        // Navigate to main app when progress reaches 100%
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => navigate('/', { replace: true }), 500);
        }

        return newProgress;
      });
    }, 1000);

    return () => {
      clearTimeout(frontendTimer);
      clearInterval(progressInterval);
    };
  }, [navigate]);

  const getStatusMessage = () => {
    if (progress >= 90) return 'Starting Nookat...';
    if (progress >= 50) return 'Initializing Docker engine...';
    return 'Loading application...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        {/* Logo and App Name */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Package className="w-20 h-20 text-blue-600 dark:text-blue-400" />
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Nookat
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Docker Desktop Alternative
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto space-y-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Loading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="text-gray-600 dark:text-gray-400">
          <p className="flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{getStatusMessage()}</span>
          </p>
        </div>

        {/* Task Status */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Frontend Ready</span>
          </div>
          <div
            className={`flex items-center space-x-2 ${progress >= 90 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${progress >= 90 ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            <span>Docker Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
