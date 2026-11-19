import { DockerHubTag, DockerImageSearchResult } from '../types/docker-images';
import { invoke } from '@tauri-apps/api/core';

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

export async function fetchImageTags(
  imageName: string,
  nameFilter: string
): Promise<string[]> {
  try {
    return await invoke('fetch_image_tags', { imageName, nameFilter });
  } catch (error) {
    console.error('Failed to fetch image tags:', error);
    throw error;
  }
}

export async function fetchImageTag(
  imageName: string,
  tag: string
): Promise<DockerHubTag | null> {
  try {
    return await invoke('fetch_image_tag', { imageName, tag });
  } catch (error) {
    console.error('Failed to look up the image tag:', error);
    throw error;
  }
}
