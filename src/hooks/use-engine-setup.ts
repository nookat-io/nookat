import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface VmInfo {
  cpu: number;
  memory: number;
  disk: number;
  architecture: string;
}

export interface ColimaStatus {
  is_installed: boolean;
  is_running: boolean;
  vm_info: VmInfo | null;
}

export interface EngineRequirements {
  needs_docker_install: boolean;
  needs_docker_start: boolean;
  needs_colima_install: boolean;
  needs_colima_start: boolean;
  missing_dependencies: string[];
}

export interface EngineSetupStatus {
  docker_status: 'Running' | 'Stopped' | 'Error' | 'NotInstalled' | 'Loading';
  colima_status: ColimaStatus;
  requirements: EngineRequirements;
}

// NEW: PHASE-004 validation interfaces
export interface ValidationResult {
  docker_working: boolean;
  colima_running: boolean;
  vm_accessible: boolean;
  issues: string[];
}

export interface ContextInfo {
  current_context: string;
  docker_host: string | null;
  available_contexts: string[];
}

export interface EngineConfig {
  installation_method: string;
  vm_config: VmInfo;
  installation_date: string;
  colima_version: string | null;
}

export interface RepairResult {
  success: boolean;
  actions_taken: string[];
  manual_steps: string[];
  next_actions: string[];
}

export function useEngineSetup() {
  const [engineStatus, setEngineStatus] = useState<EngineSetupStatus | null>(
    null
  );
  const [colimaStatus, setColimaStatus] = useState<ColimaStatus | null>(null);
  const [requirements, setRequirements] = useState<EngineRequirements | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectEngineStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await invoke<EngineSetupStatus>('detect_engine_status');
      setEngineStatus(status);
      setColimaStatus(status.colima_status);
      setRequirements(status.requirements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to detect engine status'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const checkColimaAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await invoke<ColimaStatus>('check_colima_availability');
      setColimaStatus(status);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to check Colima availability'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const getEngineRequirements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const reqs = await invoke<EngineRequirements>('get_engine_requirements');
      setRequirements(reqs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get engine requirements'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // NEW: PHASE-004 validation methods
  const validateColimaInstallation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<ValidationResult>(
        'validate_colima_installation'
      );
      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to validate Colima installation'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDockerContextInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<ContextInfo>('get_docker_context_info');
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get Docker context info'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveEngineConfig = useCallback(async (config: EngineConfig) => {
    try {
      setLoading(true);
      setError(null);
      await invoke('save_engine_config', { config });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save engine config'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const repairColimaInstallation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<RepairResult>('repair_colima_installation');
      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to repair Colima installation'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    detectEngineStatus();
  }, [detectEngineStatus]);

  return {
    engineStatus,
    colimaStatus,
    requirements,
    loading,
    error,
    detectEngineStatus,
    checkColimaAvailability,
    getEngineRequirements,
    // NEW: PHASE-004 methods
    validateColimaInstallation,
    getDockerContextInfo,
    saveEngineConfig,
    repairColimaInstallation,
    refresh: detectEngineStatus,
  };
}
