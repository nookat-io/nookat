import { useEffect } from 'react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Download } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DockerHubImage } from '../../../types/docker-images';
import { PullImageTab } from './pull-image-tab';
import { ProgressDisplay } from '../common/progress-display';
import {
  useModalState,
  useFormData,
  useProgress,
  useRegistryState,
  useDockerHubSearch,
  useSelectionFeedback,
  useTagSuggestions,
} from '../common/hooks';
import { extractErrorMessage } from '../common/utils';

interface PullImageProps {
  onSuccess?: () => void;
}

export function PullImage({ onSuccess }: PullImageProps) {
  const { isOpen, openModal, closeModal } = useModalState();
  const { pullData, resetForms, updatePullData } = useFormData();
  const { progress, resetProgress, setRunning, setSuccess, setError } =
    useProgress();
  const { registryState, updateRegistry, updateCustomRegistry, resetRegistry } =
    useRegistryState();
  const {
    searchState,
    searchContainerRef,
    searchInputRef,
    handleSearchChange,
    selectImage,
    clearSelection,
    handleSearchKeyDown,
    resetSearch,
  } = useDockerHubSearch();
  const { showFeedback, resetFeedback } = useSelectionFeedback();
  const { tagSuggestions, isLoadingTags, tagError, fetchTags, clearTags } =
    useTagSuggestions();

  // Sync form data when selected image details change
  useEffect(() => {
    if (searchState.selectedImageDetails) {
      const imageName = searchState.selectedImageDetails.is_official
        ? `library/${searchState.selectedImageDetails.name}`
        : searchState.selectedImageDetails.name;

      updatePullData({
        imageName,
        tag: 'latest',
        registry: registryState.showCustomRegistry
          ? registryState.customRegistry
          : registryState.selectedRegistry,
      });

      showFeedback(`Selected: ${imageName}`);

      // Fetch available tags for the selected image
      fetchTags(imageName);
    } else {
      // Clear tags when no image is selected
      clearTags();
    }
  }, [
    searchState.selectedImageDetails,
    updatePullData,
    registryState,
    showFeedback,
    fetchTags,
    clearTags,
  ]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchInputRef]);

  const handleRegistryChange = (value: string) => {
    updateRegistry(value);
    if (value !== 'custom') {
      updatePullData({ registry: value });
    }
  };

  const handleCustomRegistryChange = (value: string) => {
    updateCustomRegistry(value);
    updatePullData({ registry: value });
  };

  const handleImageSelect = (image: DockerHubImage) => {
    selectImage(image);

    const imageName = image.is_official ? `library/${image.name}` : image.name;

    updatePullData({
      imageName,
      tag: '',
      registry: registryState.showCustomRegistry
        ? registryState.customRegistry
        : registryState.selectedRegistry,
    });
  };

  const handlePull = async () => {
    if (!pullData.imageName.trim()) {
      setError('Image name is required');
      return;
    }

    // Validate image name format
    const imageName = pullData.imageName.trim();
    if (imageName.includes(' ') || imageName.includes('\t')) {
      setError('Image name cannot contain spaces or tabs');
      return;
    }

    // Validate registry format
    const registry = pullData.registry.trim();
    if (registry.includes(' ') || registry.includes('\t')) {
      setError('Registry cannot contain spaces or tabs');
      return;
    }

    setRunning('Pulling image...');

    try {
      await invoke('pull_image', {
        imageName: pullData.imageName,
        tag: pullData.tag,
        registry: pullData.registry,
      });

      setSuccess('Image pulled successfully!');

      // Reset form and close modal after success
      setTimeout(() => {
        closeModal();
        resetProgress();
        resetForms();
        resetRegistry();
        resetSearch();
        resetFeedback();
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Pull image error:', error);
      setError(extractErrorMessage(error));
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !progress.isRunning) {
      closeModal();
      resetProgress();
      resetForms();
      resetRegistry();
      resetSearch();
      resetFeedback();
    } else if (open) {
      // Ensure form is reset when opening
      resetForms();
      resetProgress();
      resetRegistry();
      resetSearch();
      resetFeedback();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={openModal}>
          <Download className="mr-2 h-4 w-4" />
          Pull Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pull Image from Registry</DialogTitle>
          <DialogDescription>Pull an image from a registry</DialogDescription>
        </DialogHeader>

        <PullImageTab
          pullData={pullData}
          registryState={registryState}
          searchState={searchState}
          isLoadingTags={isLoadingTags}
          tagError={tagError}
          tagSuggestions={tagSuggestions}
          onRegistryChange={handleRegistryChange}
          onCustomRegistryChange={handleCustomRegistryChange}
          onSearchChange={handleSearchChange}
          onImageSelect={handleImageSelect}
          onSearchKeyDown={handleSearchKeyDown}
          onTagChange={tag => updatePullData({ tag })}
          onClearSelection={clearSelection}
          disabled={progress.isRunning}
          searchContainerRef={searchContainerRef}
          searchInputRef={searchInputRef}
        />

        {/* Progress and Status Display */}
        <ProgressDisplay progress={progress} />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeModal}
            disabled={progress.isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePull}
            disabled={
              progress.isRunning || !pullData.imageName || !pullData.tag
            }
            className="min-w-[100px]"
          >
            {progress.isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Pulling...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Pull
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
