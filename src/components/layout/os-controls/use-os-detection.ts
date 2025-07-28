import { useEffect, useState } from 'react';
import { type OS } from './os-styles';

export const useOSDetection = (): OS => {
  const [os, setOS] = useState<OS>('macos');

  useEffect(() => {
    const detectOS = (): OS => {
      // Use userAgent as a more reliable method
      const userAgent = navigator.userAgent.toLowerCase();

      if (userAgent.includes('mac')) {
        return 'macos';
      } else if (userAgent.includes('win')) {
        return 'windows';
      } else if (userAgent.includes('linux')) {
        return 'linux';
      }

      // Fallback to platform if userAgent doesn't help
      const platform = navigator.platform?.toLowerCase() || '';
      if (platform.includes('mac')) {
        return 'macos';
      } else if (platform.includes('win')) {
        return 'windows';
      } else if (platform.includes('linux')) {
        return 'linux';
      }

      return 'macos'; // Default to macOS
    };

    setOS(detectOS());
  }, []);

  return os;
};
