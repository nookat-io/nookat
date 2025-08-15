use crate::entities::EngineStatus;
use crate::services::engine;
use tracing::instrument;

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn detect_engine_status() -> Result<EngineStatus, String> {
    // engine::get_engine_status().await
    todo!()
}

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn check_colima_availability() -> Result<ColimaStatus, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.check_colima_status().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn check_homebrew_availability() -> Result<HomebrewStatus, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.check_homebrew_availability().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn start_colima_installation() -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.start_colima_installation().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_installation_logs() -> Result<Vec<String>, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.get_installation_logs().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn start_colima_vm(config: VmConfig) -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.start_colima_vm(config).await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn start_colima_vm_background(config: VmConfig) -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.start_colima_vm_background(config).await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_vm_startup_logs() -> Result<Vec<String>, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.get_vm_startup_logs().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_colima_versions() -> Result<VersionInfo, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.get_colima_versions().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn download_colima_binaries() -> Result<DownloadResult, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.download_colima_binaries().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn verify_binary_checksums() -> Result<bool, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.verify_binary_checksums().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn binary_install_colima() -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.install_colima_binary().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_binary_installation_logs() -> Result<Vec<String>, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.get_binary_installation_logs().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn clear_binary_installation_logs() -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.clear_binary_installation_logs().await
// }

// // NEW: PHASE-004 validation commands
// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn validate_colima_installation() -> Result<ValidationResult, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.validate_colima_installation().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_docker_context_info() -> Result<ContextInfo, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.get_docker_context_info().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn save_engine_config(config: EngineConfig) -> Result<(), String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.save_engine_config(config).await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn repair_colima_installation() -> Result<RepairResult, String> {
//     let engine_service = EngineSetupService::new();
//     engine_service.repair_colima_installation().await
// }

// // NEW: Detailed installation status commands
// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_lima_installation_status() -> Result<crate::services::lima_service::LimaInstallationStatus, String> {
//     crate::services::lima_service::LimaService::get_lima_installation_status().await
// }

// #[tauri::command]
// #[instrument(skip_all, err)]
// pub async fn get_colima_installation_status() -> Result<crate::services::colima_service::ColimaInstallationStatus, String> {
//     crate::services::colima_service::ColimaService::get_colima_installation_status().await
// }
