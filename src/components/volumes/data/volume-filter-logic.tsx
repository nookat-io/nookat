import { VolumeData } from './volume-data-provider';

interface VolumeFilterLogicProps {
  volumes: VolumeData[];
  filter: 'all' | 'used' | 'unused';
  searchTerm: string;
  children: (filteredVolumes: VolumeData[]) => React.ReactNode;
}

export function VolumeFilterLogic({
  volumes,
  filter,
  searchTerm,
  children,
}: VolumeFilterLogicProps) {
  const filteredVolumes = volumes.filter(volume => {
    const volumeName = volume.name.toLowerCase();
    const driverName = volume.driver.toLowerCase();

    const matchesSearch =
      volumeName.includes(searchTerm.toLowerCase()) ||
      driverName.includes(searchTerm.toLowerCase());

    // Filter by usage status if specified
    if (filter === 'used') {
      // Consider volumes with ref_count > 0 as used
      const isUsed =
        volume.usage_data?.ref_count && volume.usage_data.ref_count > 0;
      return matchesSearch && isUsed;
    }
    if (filter === 'unused') {
      // Consider volumes with ref_count = 0 or no usage data as unused
      const isUnused =
        !volume.usage_data?.ref_count || volume.usage_data.ref_count === 0;
      return matchesSearch && isUnused;
    }

    // 'all' filter - just match search
    return matchesSearch;
  });

  return <>{children(filteredVolumes)}</>;
}
