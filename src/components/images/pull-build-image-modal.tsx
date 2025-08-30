'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Download, Hammer, CheckCircle, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PullBuildImageModalProps {
  onSuccess?: () => void;
}

type ActionType = 'pull' | 'build';

interface PullFormData {
  imageName: string;
  tag: string;
  registry: string;
}

interface BuildFormData {
  dockerfilePath: string;
  buildContext: string;
  imageName: string;
  tag: string;
  buildArgs: string;
  noCache: boolean;
  pull: boolean;
}

interface ProgressState {
  isRunning: boolean;
  progress: string;
  error: string | null;
  success: boolean;
}

// Type for error objects that might have a message property
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an object has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function PullBuildImageModal({ onSuccess }: PullBuildImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionType>('pull');
  const [progress, setProgress] = useState<ProgressState>({
    isRunning: false,
    progress: '',
    error: null,
    success: false,
  });

  // Form data for pull operation
  const [pullData, setPullData] = useState<PullFormData>({
    imageName: '',
    tag: 'latest',
    registry: 'docker.io',
  });

  // Form data for build operation
  const [buildData, setBuildData] = useState<BuildFormData>({
    dockerfilePath: '',
    buildContext: '',
    imageName: '',
    tag: 'latest',
    buildArgs: '',
    noCache: false,
    pull: false,
  });

  const resetProgress = () => {
    setProgress({
      isRunning: false,
      progress: '',
      error: null,
      success: false,
    });
  };

  // Debug effect to log progress state changes
  useEffect(() => {
    console.log('Progress state changed:', progress);
  }, [progress]);

  const handlePull = async () => {
    if (!pullData.imageName.trim()) {
      setProgress(prev => ({ ...prev, error: 'Image name is required' }));
      return;
    }

    // Validate image name format
    const imageName = pullData.imageName.trim();
    if (imageName.includes(' ') || imageName.includes('\t')) {
      setProgress(prev => ({
        ...prev,
        error: 'Image name cannot contain spaces or tabs',
      }));
      return;
    }

    // Validate registry format
    const registry = pullData.registry.trim();
    if (registry.includes(' ') || registry.includes('\t')) {
      setProgress(prev => ({
        ...prev,
        error: 'Registry cannot contain spaces or tabs',
      }));
      return;
    }

    setProgress({
      isRunning: true,
      progress: 'Pulling image...',
      error: null,
      success: false,
    });

    try {
      const fullImageName =
        pullData.tag === 'latest'
          ? pullData.imageName
          : `${pullData.imageName}:${pullData.tag}`;

      console.log('Attempting to pull image:', {
        fullImageName,
        registry: pullData.registry,
      });

      const result = await invoke('pull_image', {
        imageName: fullImageName,
        registry: pullData.registry,
      });

      console.log('Pull result:', result);

      setProgress({
        isRunning: false,
        progress: 'Image pulled successfully!',
        error: null,
        success: true,
      });

      // Reset form and close modal after success
      setTimeout(() => {
        setIsOpen(false);
        resetProgress();
        setPullData({ imageName: '', tag: 'latest', registry: 'docker.io' });
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Pull image error:', error);

      // Extract more detailed error information
      let errorMessage = 'Failed to pull image';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'toString' in error) {
        errorMessage = String(error);
      }

      console.log('Extracted error message:', errorMessage);
      console.log('Error type:', typeof error);
      console.log('Error object:', error);

      console.log('Setting progress with error:', {
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });

      setProgress({
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });

      console.log('Progress state after setProgress:', {
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });
    }
  };

  const handleBuild = async () => {
    if (!buildData.dockerfilePath.trim() || !buildData.imageName.trim()) {
      setProgress(prev => ({
        ...prev,
        error: 'Dockerfile path and image name are required',
      }));
      return;
    }

    setProgress({
      isRunning: true,
      progress: 'Building image...',
      error: null,
      success: false,
    });

    try {
      const fullImageName =
        buildData.tag === 'latest'
          ? buildData.imageName
          : `${buildData.imageName}:${buildData.tag}`;

      // Parse build args from string to key-value pairs
      const buildArgs: Record<string, string> = {};
      if (buildData.buildArgs.trim()) {
        buildData.buildArgs.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            buildArgs[key.trim()] = value.trim();
          }
        });
      }

      await invoke('build_image', {
        dockerfilePath: buildData.dockerfilePath,
        buildContext: buildData.buildContext || '.',
        imageName: fullImageName,
        buildArgs,
        options: {
          noCache: buildData.noCache,
          pull: buildData.pull,
        },
      });

      setProgress({
        isRunning: false,
        progress: 'Image built successfully!',
        error: null,
        success: true,
      });

      // Reset form and close modal after success
      setTimeout(() => {
        setIsOpen(false);
        resetProgress();
        setBuildData({
          dockerfilePath: '',
          buildContext: '',
          imageName: '',
          tag: 'latest',
          buildArgs: '',
          noCache: false,
          pull: false,
        });
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Build image error:', error);

      // Extract more detailed error information
      let errorMessage = 'Failed to build image';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (isErrorWithMessage(error)) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'toString' in error) {
        errorMessage = String(error);
      }

      setProgress({
        isRunning: false,
        progress: '',
        error: errorMessage,
        success: false,
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !progress.isRunning) {
      setIsOpen(false);
      resetProgress();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as ActionType);
    resetProgress();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Pull/Build Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pull or Build Image</DialogTitle>
          <DialogDescription>
            Pull an image from a registry or build an image from a Dockerfile
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pull">Pull from Registry</TabsTrigger>
            <TabsTrigger value="build">Build from Dockerfile</TabsTrigger>
          </TabsList>

          <TabsContent value="pull" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pull-image-name">Image Name</Label>
                  <Input
                    id="pull-image-name"
                    placeholder="e.g., nginx, ubuntu"
                    value={pullData.imageName}
                    onChange={e =>
                      setPullData(prev => ({
                        ...prev,
                        imageName: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pull-tag">Tag</Label>
                  <Input
                    id="pull-tag"
                    placeholder="latest"
                    value={pullData.tag}
                    onChange={e =>
                      setPullData(prev => ({ ...prev, tag: e.target.value }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pull-registry">Registry</Label>
                <Input
                  id="pull-registry"
                  placeholder="docker.io"
                  value={pullData.registry}
                  onChange={e =>
                    setPullData(prev => ({ ...prev, registry: e.target.value }))
                  }
                  disabled={progress.isRunning}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="build" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="build-dockerfile">Dockerfile Path</Label>
                  <Input
                    id="build-dockerfile"
                    placeholder="e.g., ./Dockerfile"
                    value={buildData.dockerfilePath}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        dockerfilePath: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="build-context">Build Context</Label>
                  <Input
                    id="build-context"
                    placeholder="e.g., ."
                    value={buildData.buildContext}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        buildContext: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="build-image-name">Image Name</Label>
                  <Input
                    id="build-image-name"
                    placeholder="e.g., myapp"
                    value={buildData.imageName}
                    onChange={e =>
                      setBuildData(prev => ({
                        ...prev,
                        imageName: e.target.value,
                      }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="build-tag">Tag</Label>
                  <Input
                    id="build-tag"
                    placeholder="latest"
                    value={buildData.tag}
                    onChange={e =>
                      setBuildData(prev => ({ ...prev, tag: e.target.value }))
                    }
                    disabled={progress.isRunning}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="build-args">
                  Build Arguments (key=value, one per line)
                </Label>
                <Textarea
                  id="build-args"
                  placeholder="VERSION=1.0.0&#10;ENVIRONMENT=production"
                  value={buildData.buildArgs}
                  onChange={e =>
                    setBuildData(prev => ({
                      ...prev,
                      buildArgs: e.target.value,
                    }))
                  }
                  disabled={progress.isRunning}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="no-cache"
                    checked={buildData.noCache}
                    onCheckedChange={checked =>
                      setBuildData(prev => ({ ...prev, noCache: checked }))
                    }
                    disabled={progress.isRunning}
                  />
                  <Label htmlFor="no-cache">No Cache</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pull"
                    checked={buildData.pull}
                    onCheckedChange={checked =>
                      setBuildData(prev => ({ ...prev, pull: checked }))
                    }
                    disabled={progress.isRunning}
                  />
                  <Label htmlFor="pull">Pull Base Images</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress and Status Display */}
        {(progress.progress || progress.error || progress.success) && (
          <div className="mt-4 p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              {progress.isRunning && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
              {progress.success && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {progress.error && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  progress.error
                    ? 'text-red-600'
                    : progress.success
                      ? 'text-green-600'
                      : ''
                }
              >
                {progress.progress || (progress.error ? 'Error occurred' : '')}
              </span>
            </div>
            {progress.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">
                      {progress.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={progress.isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={activeTab === 'pull' ? handlePull : handleBuild}
            disabled={progress.isRunning}
            className="min-w-[100px]"
          >
            {progress.isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {activeTab === 'pull' ? 'Pulling...' : 'Building...'}
              </>
            ) : (
              <>
                {activeTab === 'pull' ? (
                  <Download className="mr-2 h-4 w-4" />
                ) : (
                  <Hammer className="mr-2 h-4 w-4" />
                )}
                {activeTab === 'pull' ? 'Pull Image' : 'Build Image'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
