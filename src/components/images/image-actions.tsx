import { Button } from '../ui/button';
import { Download, Upload, Trash2, Search } from 'lucide-react';

interface ImageActionsProps {
  selectedImages: string[];
}

export function ImageActions({ selectedImages }: ImageActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="default">
        <Download className="mr-2 h-4 w-4" />
        Pull Image
      </Button>
      
      <Button variant="outline">
        <Search className="mr-2 h-4 w-4" />
        Browse Registry
      </Button>
      
      {selectedImages.length > 0 && (
        <>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Push
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </>
      )}
    </div>
  );
}