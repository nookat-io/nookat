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
  useTagSuggestions,
  useTagStatus,
} from '../common/hooks';
import { errorMessage } from '../../../utils/error-message';
import {
  DOCKER_HUB,
  LookalikeCheck,
  checkImageReference,
  needsConfirmation,
} from '../../../lib/image-source';
import {
  DEFAULT_PROGRESS_STATE,
  DEFAULT_TAG,
  canPullWithTag,
  pullReference,
  trimPullData,
} from '../common/utils';
import { PullFormData, TagMessage, TagStatus } from '../common/types';
import { createTagLookup } from '../common/tag-lookup';
import { ImageSourceConfirmDialog } from '../../common/image-source-warnings';

const SUCCESS_MESSAGE_VISIBLE_MS = 2000;

const closeOnlyAnOpenList = (event: KeyboardEvent) => {
  const hasOpenList =
    event.target instanceof HTMLElement &&
    event.target.getAttribute('aria-expanded') === 'true';
  if (hasOpenList) {
    event.preventDefault();
  }
};

const hasSpaceOrTab = (value: string) =>
  value.includes(' ') || value.includes('\t');

function tagMessageFor({
  status,
  tag,
  hasNoDefaultTag,
  suggestionsError,
}: {
  status: TagStatus;
  tag: string;
  hasNoDefaultTag: boolean;
  suggestionsError: string | null;
}): TagMessage | null {
  if (status.kind === 'invalid') {
    return {
      tone: 'error',
      text: 'Use letters, digits, _, . and -, not starting with . or -.',
    };
  }
  if (status.kind === 'missing') {
    return {
      tone: 'error',
      text: `No tag ${tag} on Docker Hub.`,
    };
  }
  if (status.kind === 'unknown') {
    return {
      tone: 'muted',
      text: 'Could not check this tag on Docker Hub.',
    };
  }
  if (hasNoDefaultTag) {
    return {
      tone: 'muted',
      text: `This image has no ${DEFAULT_TAG} tag.`,
    };
  }
  if (suggestionsError) {
    return { tone: 'error', text: suggestionsError };
  }
  return null;
}

export function PullImage() {
  const { isOpen, openModal, closeModal } = useModalState();
  const { pullData, resetForms, updatePullData, chooseTagIfBlank } =
    useFormData();
  const { progress, resetProgress, setRunning, setSuccess, setError } =
    useProgress();
  const { registryState, updateRegistry, updateCustomRegistry, resetRegistry } =
    useRegistryState();
  const [lookupTag] = useState(() => createTagLookup());
  const [defaultTagCheck, setDefaultTagCheck] = useState<{
    imageName: string;
    defaultTag: 'checking' | 'present' | 'absent';
  } | null>(null);

  const chooseImage = useCallback(
    (image: DockerHubImage) => {
      const registry = registryState.showCustomRegistry
        ? registryState.customRegistry
        : registryState.selectedRegistry;
      updatePullData({ imageName: image.name, tag: '', registry });

      if (registry.trim() !== DOCKER_HUB) {
        setDefaultTagCheck(null);
        chooseTagIfBlank(image.name, DEFAULT_TAG);
        return;
      }
      setDefaultTagCheck({ imageName: image.name, defaultTag: 'checking' });
      const settleDefaultTag = (defaultTag: 'present' | 'absent') => {
        setDefaultTagCheck(check =>
          check?.imageName === image.name
            ? { imageName: image.name, defaultTag }
            : check
        );
        if (defaultTag === 'present') {
          chooseTagIfBlank(image.name, DEFAULT_TAG);
        }
      };
      lookupTag(image.name, DEFAULT_TAG).then(
        found => settleDefaultTag(found ? 'present' : 'absent'),
        () => settleDefaultTag('present')
      );
    },
    [registryState, updatePullData, chooseTagIfBlank, lookupTag]
  );

  const {
    searchState,
    searchContainerRef,
    searchInputRef,
    handleSearchChange,
    selectImage,
    clearSelection,
    handleSearchKeyDown,
    resetSearch,
  } = useDockerHubSearch(chooseImage);
  const { tagSuggestions, isLoadingTags, tagError } = useTagSuggestions(
    searchState.selectedImageDetails?.name ?? null,
    pullData.tag
  );
  const tagStatus = useTagStatus(
    lookupTag,
    pullData.imageName,
    pullData.tag,
    pullData.registry.trim() === DOCKER_HUB
  );
  const defaultTagCheckOfThisImage =
    !pullData.tag && defaultTagCheck?.imageName === pullData.imageName
      ? defaultTagCheck
      : null;
  const tagMessage = tagMessageFor({
    status: tagStatus,
    tag: pullData.tag,
    hasNoDefaultTag: defaultTagCheckOfThisImage?.defaultTag === 'absent',
    suggestionsError: tagError,
  });
  const isCheckingTags =
    isLoadingTags ||
    tagStatus.kind === 'checking' ||
    defaultTagCheckOfThisImage?.defaultTag === 'checking';
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
    setDefaultTagCheck(null);
  }, [resetForms, resetProgress, resetRegistry, resetSearch]);

  const closeAndResetPullForm = useCallback(() => {
    closeModal();
    resetPullForm();
  }, [closeModal, resetPullForm]);

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

  const clearChosenImage = () => {
    clearSelection();
    updatePullData({ imageName: '', tag: '' });
    setDefaultTagCheck(null);
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
      <DialogContent
        className="max-w-2xl"
        onOpenAutoFocus={focusSearchInput}
        onEscapeKeyDown={closeOnlyAnOpenList}
      >
        <DialogHeader>
          <DialogTitle>Pull Image from Registry</DialogTitle>
          <DialogDescription>Pull an image from a registry</DialogDescription>
        </DialogHeader>

        <PullImageTab
          pullData={pullData}
          registryState={registryState}
          searchState={searchState}
          isLoadingTags={isCheckingTags}
          tagMessage={tagMessage}
          tagStatus={tagStatus}
          tagSuggestions={tagSuggestions}
          onRegistryChange={handleRegistryChange}
          onCustomRegistryChange={handleCustomRegistryChange}
          onSearchChange={handleSearchChange}
          onImageSelect={selectImage}
          onSearchKeyDown={handleSearchKeyDown}
          onTagChange={tag => updatePullData({ tag })}
          onClearSelection={clearChosenImage}
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
              progress.isRunning ||
              !pullData.imageName ||
              !pullData.tag ||
              !canPullWithTag(tagStatus)
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
