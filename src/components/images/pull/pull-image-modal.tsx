import { useCallback, useEffect, useState } from 'react';
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
import { Channel, invoke } from '@tauri-apps/api/core';
import { DockerHubImage } from '../../../types/docker-images';
import { ImagePullProgress } from '../../../types/image-pull';
import { PullImageTab } from './pull-image-tab';
import { ProgressDisplay } from '../common/progress-display';
import { PullSummary, advancePull } from '../common/pull-summary';
import {
  useModalState,
  useFormData,
  useProgress,
  useRegistryState,
  useDockerHubSearch,
  useSelectionFeedback,
  useTagSuggestions,
} from '../common/hooks';
import { errorMessage } from '../../../utils/error-message';
import {
  LookalikeCheck,
  checkImageReference,
  needsConfirmation,
} from '../../../lib/image-source';
import {
  DEFAULT_PROGRESS_STATE,
  pullReference,
  trimPullData,
} from '../common/utils';
import { PullFormData } from '../common/types';
import { ImageSourceConfirmDialog } from '../../common/image-source-warnings';

const SUCCESS_MESSAGE_VISIBLE_MS = 2000;

const hasSpaceOrTab = (value: string) =>
  value.includes(' ') || value.includes('\t');

export function PullImage() {
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
  const [pullToConfirm, setPullToConfirm] = useState<{
    request: PullFormData;
    source: LookalikeCheck;
  } | null>(null);
  const [attemptedReference, setAttemptedReference] = useState<string | null>(
    null
  );
  const [pullSummary, setPullSummary] = useState<PullSummary | null>(null);
  const progressOfChosenImage =
    progress.isRunning || attemptedReference === pullReference(pullData)
      ? progress
      : DEFAULT_PROGRESS_STATE;

  const resetPullForm = useCallback(() => {
    resetForms();
    resetProgress();
    resetRegistry();
    resetSearch();
    resetFeedback();
  }, [resetForms, resetProgress, resetRegistry, resetSearch, resetFeedback]);

  const closeAndResetPullForm = useCallback(() => {
    closeModal();
    resetPullForm();
  }, [closeModal, resetPullForm]);

  useEffect(() => {
    if (searchState.selectedImageDetails) {
      const imageName = searchState.selectedImageDetails.name;

      updatePullData({
        imageName,
        tag: 'latest',
        registry: registryState.showCustomRegistry
          ? registryState.customRegistry
          : registryState.selectedRegistry,
      });

      showFeedback(`Selected: ${imageName}`);
      fetchTags(imageName);
    } else {
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

  useEffect(() => {
    if (!progress.success) {
      return;
    }
    const closeTimer = setTimeout(
      closeAndResetPullForm,
      SUCCESS_MESSAGE_VISIBLE_MS
    );
    return () => clearTimeout(closeTimer);
  }, [progress.success, closeAndResetPullForm]);

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

    updatePullData({
      imageName: image.name,
      tag: '',
      registry: registryState.showCustomRegistry
        ? registryState.customRegistry
        : registryState.selectedRegistry,
    });
  };

  const handlePull = () => {
    const request = trimPullData(pullData);
    setAttemptedReference(pullReference(request));
    if (!request.imageName) {
      setError('Image name is required');
      return;
    }

    if (hasSpaceOrTab(request.imageName)) {
      setError('Image name cannot contain spaces or tabs');
      return;
    }

    if (hasSpaceOrTab(request.registry)) {
      setError('Registry cannot contain spaces or tabs');
      return;
    }

    const source = checkImageReference(pullReference(request));
    if (needsConfirmation(source)) {
      setPullToConfirm({ request, source });
      return;
    }

    pullImage(request);
  };

  const pullImage = async ({ imageName, tag, registry }: PullFormData) => {
    setPullToConfirm(null);
    setPullSummary(null);
    setRunning('Pulling image...');

    try {
      const onProgress = new Channel<ImagePullProgress>(progress =>
        setPullSummary(previous => advancePull(previous, progress))
      );
      await invoke('pull_image', { imageName, tag, registry, onProgress });
      setSuccess('Image pulled successfully!');
    } catch (error) {
      console.error('Pull image error:', error);
      setError(errorMessage(error));
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetPullForm();
    } else if (!progress.isRunning) {
      closeAndResetPullForm();
    }
  };

  const focusSearchInput = (event: Event) => {
    event.preventDefault();
    searchInputRef.current?.focus();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={openModal}>
          <Download className="mr-2 h-4 w-4" />
          Pull Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" onOpenAutoFocus={focusSearchInput}>
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

        <ProgressDisplay
          progress={progressOfChosenImage}
          pullSummary={pullSummary}
        />

        {pullToConfirm && (
          <ImageSourceConfirmDialog
            check={pullToConfirm.source}
            onCancel={() => setPullToConfirm(null)}
            onConfirm={() => pullImage(pullToConfirm.request)}
          />
        )}

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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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
