import { ImagePullLayer, ImagePullProgress } from '../../../types/image-pull';
import { formatBytes } from '../../../utils/format';

const DOWNLOAD_SHARE = 0.8;
const EXTRACT_SHARE = 1 - DOWNLOAD_SHARE;
const LAST_PERCENT_BEFORE_DONE = 99;

export interface PullSummary {
  layerCount: number;
  readyLayers: number;
  transferredLayers: number;
  downloadedBytes: number;
  totalBytes: number | null;
  percentage: number | null;
}

const isReady = (layer: ImagePullLayer) =>
  layer.phase === 'complete' || layer.phase === 'already_exists';

const isAwaitingSize = (layer: ImagePullLayer) =>
  layer.size === null && layer.phase !== 'complete';

const withinSize = (bytes: number, layer: ImagePullLayer) =>
  layer.size === null ? bytes : Math.min(bytes, layer.size);

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

function estimatedPercentage(
  transferred: ImagePullLayer[],
  downloadedBytes: number,
  extractedBytes: number
) {
  const sizes = transferred.flatMap(layer =>
    layer.size === null ? [] : [layer.size]
  );
  const knownBytes = sum(sizes);
  if (knownBytes === 0) {
    return null;
  }
  const averageLayerBytes = knownBytes / sizes.length;
  const estimatedBytes =
    knownBytes + transferred.filter(isAwaitingSize).length * averageLayerBytes;
  const doneBytes =
    DOWNLOAD_SHARE * downloadedBytes + EXTRACT_SHARE * extractedBytes;
  return Math.min(
    LAST_PERCENT_BEFORE_DONE,
    Math.floor((doneBytes / estimatedBytes) * 100)
  );
}

export function summarizePull({ layers }: ImagePullProgress): PullSummary {
  const transferred = layers.filter(layer => layer.phase !== 'already_exists');
  const readyLayers = layers.filter(isReady).length;
  const downloadedBytes = sum(
    transferred.map(layer => withinSize(layer.downloaded, layer))
  );
  const extractedBytes = sum(
    transferred.map(layer => withinSize(layer.extracted, layer))
  );
  const totalBytes =
    layers.length > 0 && !transferred.some(isAwaitingSize)
      ? sum(transferred.map(layer => layer.size ?? 0))
      : null;
  const isEveryLayerReady = layers.length > 0 && readyLayers === layers.length;

  return {
    layerCount: layers.length,
    readyLayers,
    transferredLayers: transferred.length,
    downloadedBytes,
    totalBytes,
    percentage: isEveryLayerReady
      ? 100
      : estimatedPercentage(transferred, downloadedBytes, extractedBytes),
  };
}

export function advancePull(
  previous: PullSummary | null,
  progress: ImagePullProgress
): PullSummary {
  const next = summarizePull(progress);
  const percentages = [previous?.percentage, next.percentage].filter(
    percentage => typeof percentage === 'number'
  );
  return {
    ...next,
    percentage: percentages.length > 0 ? Math.max(...percentages) : null,
  };
}

export function describePull(summary: PullSummary): string | null {
  if (summary.layerCount === 0) {
    return null;
  }
  const layers = `${summary.readyLayers} of ${summary.layerCount} layers ready`;
  const hasStartedDownloading =
    summary.downloadedBytes > 0 || summary.totalBytes !== null;
  if (summary.transferredLayers === 0 || !hasStartedDownloading) {
    return layers;
  }
  const downloaded =
    summary.totalBytes === null
      ? `${formatBytes(summary.downloadedBytes)} downloaded`
      : `${formatBytes(summary.downloadedBytes)} of ${formatBytes(summary.totalBytes)} downloaded`;
  return `${downloaded} · ${layers}`;
}
