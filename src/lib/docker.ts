import { DockerImageSearchResult } from '../types/docker-images';
import { invoke } from '@tauri-apps/api/core';

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
 * Fetch available tags for a Docker image from Docker Hub
 */
export async function fetchImageTags(imageName: string): Promise<string[]> {
  try {
    return await invoke('fetch_image_tags', { imageName });
  } catch (error) {
    console.error('Failed to fetch image tags:', error);
    throw error;
  }
}
