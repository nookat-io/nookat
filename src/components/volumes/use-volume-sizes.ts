import { useEffect, useState } from 'react';
import { VolumeActionService } from './volume-actions-service';
import { VolumeSizes } from './volume-types';
import { useMainWindowVisible } from '../../hooks/use-main-window-visible';

export const SIZES_REFRESH_MS = 60_000;

const NO_SIZES: VolumeSizes = {};

export function useVolumeSizes(volumeNames: string[]): VolumeSizes {
  const [sizes, setSizes] = useState<VolumeSizes>(NO_SIZES);
  const isWindowVisible = useMainWindowVisible();
  const namesKey = JSON.stringify([...volumeNames].sort());
  const hasVolumes = volumeNames.length > 0;

  useEffect(() => {
    if (!isWindowVisible || !hasVolumes) return;

    let isCurrent = true;
    let nextRequest: ReturnType<typeof setTimeout> | undefined;

    const requestSizes = async () => {
      let engineReportsSizes = true;
      try {
        const answer = await VolumeActionService.getVolumeSizes();
        engineReportsSizes = answer !== null;
        if (isCurrent) setSizes(answer ?? NO_SIZES);
      } catch (error) {
        if (isCurrent) console.error('Failed to read volume sizes:', error);
      } finally {
        if (isCurrent && engineReportsSizes) {
          nextRequest = setTimeout(requestSizes, SIZES_REFRESH_MS);
        }
      }
    };

    requestSizes();

    return () => {
      isCurrent = false;
      clearTimeout(nextRequest);
    };
  }, [namesKey, hasVolumes, isWindowVisible]);

  return sizes;
}
