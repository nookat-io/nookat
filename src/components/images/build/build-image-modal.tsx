import { Button } from '../../ui/button';
import { Hammer } from 'lucide-react';

interface BuildImageModalProps {
  onSuccess?: () => void;
}

export function BuildImageModal({onSuccess: onSuccess}: BuildImageModalProps) {
  return (
    <Button disabled className="opacity-50 cursor-not-allowed" onClick={onSuccess}>
      <Hammer className="mr-2 h-4 w-4" />
      Build Image (Coming Soon)
    </Button>
  );
}
