export interface NetworkData {
  id: string;
  name: string;
  driver: string;
  scope: string;
  created?: string;
  subnet?: string;
  gateway?: string;
  containers: number;
  internal: boolean;
  ipam: {
    driver?: string;
    config?: Array<{
      subnet?: string;
      gateway?: string;
    }>;
  };
  labels?: Record<string, string>;
}
