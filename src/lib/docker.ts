import {
  LocalDockerImage,
  DockerImageSearchResult,
} from '../types/docker-images';
import { invoke } from '@tauri-apps/api/core';

/**
 * Check if Docker daemon is accessible
 */
export async function checkDockerAccess(): Promise<boolean> {
  try {
    return await invoke('check_docker_access');
  } catch (error) {
    console.error('Failed to check Docker access:', error);
    return false;
  }
}

/**
 * List all local Docker images
 */
export async function listDockerImages(): Promise<LocalDockerImage[]> {
  try {
    const lines = await invoke<string[]>('get_docker_images_cli');
    return parseDockerImagesOutput(lines.join('\n'));
  } catch (error) {
    console.error('Failed to list Docker images:', error);
    throw error;
  }
}

/**
 * Export Docker image to tar file
 */
export async function exportDockerImage(
  imageName: string,
  outputPath: string
): Promise<void> {
  try {
    await invoke('export_docker_image', { imageName, outputPath });
  } catch (error) {
    console.error('Failed to export Docker image:', error);
    throw error;
  }
}

/**
 * Inspect Docker image details
 */
export async function inspectDockerImage(imageName: string): Promise<unknown> {
  try {
    return await invoke('inspect_docker_image', { imageName });
  } catch (error) {
    console.error('Failed to inspect Docker image:', error);
    throw error;
  }
}

/**
 * Search Docker Hub for images
 */
export async function searchDockerHub(
  query: string
): Promise<DockerImageSearchResult> {
  try {
    return await invoke('search_docker_hub', { query });
  } catch (error) {
    console.error('Failed to search Docker Hub:', error);
    throw error;
  }
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Parse Docker CLI output for images
 */
export function parseDockerImagesOutput(output: string): LocalDockerImage[] {
  const lines = output.trim().split('\n');
  const images: LocalDockerImage[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length >= 6) {
      const [id, repository, tag, digest, size, created] = parts;
      images.push({
        id: id.trim(),
        repository: repository.trim() || '<none>',
        tag: tag.trim() || '<none>',
        digest: digest.trim(),
        size: size.trim(),
        created: created.trim(),
        fullName:
          repository.trim() && tag.trim()
            ? `${repository.trim()}:${tag.trim()}`
            : '<none>',
      });
    }
  }

  return images;
}
