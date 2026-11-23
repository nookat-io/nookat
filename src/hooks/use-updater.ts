import { useContext } from 'react';
import { UpdaterContext } from '../contexts/updater-context';

export function useUpdater() {
  const context = useContext(UpdaterContext);
  if (context === undefined) {
    throw new Error('useUpdater must be used within an UpdaterProvider');
  }
  return context;
}
