import { ImageActions } from './actions';
import { ImageData } from './image-data-provider';

interface ImageHeaderProps {
  selectedImages: string[];
  images: ImageData[];
  onActionComplete: () => void;
}

export function ImageHeader({
  selectedImages,
  images,
  onActionComplete,
}: ImageHeaderProps) {
  return (
    <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col items-start justify-start">
          <h1 className="text-3xl font-bold bg-clip-text">Images</h1>
          <p className="text-muted-foreground mt-2">
            Manage your images
            {images.length > 0 &&
              ` - ${images.length} image${images.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-start">
          <ImageActions
            selectedImages={selectedImages}
            onRefresh={onActionComplete}
          />
        </div>
      </div>
    </div>
  );
}
