use crate::entities::{Container, Engine, EngineState};
use crate::services::{ContainersService, ImagesService, NetworksService, VolumesService};
use crate::state::SharedEngineState;
use bollard::models::ContainerSummary;
use bollard::query_parameters::EventsOptions;
use bollard::Docker;
use chrono::Utc;
use futures_util::{Stream, StreamExt};
use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::{futures::Notified, Mutex, MutexGuard};
use tokio::task::JoinError;
use tracing::{debug, error, info, warn};

type MonitorResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

async fn follow_events_until_the_stream_breaks<T, E, Reaction>(
    events: impl Stream<Item = Result<T, E>>,
    mut react: impl FnMut() -> Reaction,
) -> MonitorResult<()>
where
    E: Into<Box<dyn std::error::Error + Send + Sync>>,
    Reaction: Future<Output = ()>,
{
    futures_util::pin_mut!(events);
    while let Some(event) = events.next().await {
        event.map_err(Into::into)?;
        react().await;
    }
    Err("The Docker events stream ended".into())
}

const POLL_INTERVAL: Duration = Duration::from_secs(5);
const UNPUBLISHED_VERSION: u64 = 0;

pub struct EngineStateMonitor {
    state: Arc<SharedEngineState>,
    is_monitoring: Arc<Mutex<bool>>,
    last_published: Arc<Mutex<Option<EngineState>>>,
    app_handle: tauri::AppHandle,
}

impl EngineStateMonitor {
    pub fn new(state: Arc<SharedEngineState>, app_handle: tauri::AppHandle) -> Self {
        Self {
            state,
            is_monitoring: Arc::new(Mutex::new(false)),
            last_published: Arc::new(Mutex::new(None)),
            app_handle,
        }
    }

    pub async fn start_monitoring(&self) -> MonitorResult<()> {
        let mut is_monitoring = self.is_monitoring.lock().await;

        if *is_monitoring {
            debug!("Engine state monitoring already running");
            return Ok(());
        }

        *is_monitoring = true;
        drop(is_monitoring);

        let state = self.state.clone();
        let is_monitoring = self.is_monitoring.clone();
        let last_published = self.last_published.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            if let Err(e) =
                Self::monitor_loop(state, is_monitoring, last_published, app_handle).await
            {
                error!("Engine state monitoring error: {}", e);
            }
        });

        debug!("Engine state monitoring started");
        Ok(())
    }

    async fn monitor_loop(
        state: Arc<SharedEngineState>,
        is_monitoring: Arc<Mutex<bool>>,
        last_published: Arc<Mutex<Option<EngineState>>>,
        app_handle: tauri::AppHandle,
    ) -> MonitorResult<()> {
        let spawn_docker_events_task = || {
            tokio::spawn(Self::monitor_docker_events_continuously(
                state.clone(),
                last_published.clone(),
                is_monitoring.clone(),
                app_handle.clone(),
            ))
        };

        let mut docker_events_task = spawn_docker_events_task();

        if let Err(e) = Self::publish_if_changed(&state, &last_published, &app_handle).await {
            warn!("Initial baseline snapshot error: {}", e);
        }

        let mut poll_interval = tokio::time::interval(POLL_INTERVAL);

        loop {
            poll_interval.tick().await;

            if !*is_monitoring.lock().await {
                break;
            }

            if docker_events_task.is_finished() {
                log_docker_events_task_exit(docker_events_task.await);
                docker_events_task = spawn_docker_events_task();
                debug!("Docker events monitoring task respawned");
            }

            if let Err(e) = Self::publish_if_changed(&state, &last_published, &app_handle).await {
                warn!("State change check error: {}", e);
            }
        }

        Ok(())
    }

    async fn monitor_docker_events_continuously(
        state: Arc<SharedEngineState>,
        last_published: Arc<Mutex<Option<EngineState>>>,
        is_monitoring: Arc<Mutex<bool>>,
        app_handle: tauri::AppHandle,
    ) -> MonitorResult<()> {
        let mut consecutive_failures = 0;
        const MAX_CONSECUTIVE_FAILURES: u32 = 5;

        loop {
            if !*is_monitoring.lock().await {
                break;
            }

            let connection_forgotten = state.connection_forgotten();
            match state.get_engine().await {
                Ok(engine) => {
                    if let Some(docker) = &engine.docker {
                        consecutive_failures = 0;

                        if let Err(e) = Self::monitor_docker_events(
                            docker,
                            connection_forgotten,
                            &state,
                            &last_published,
                            &app_handle,
                        )
                        .await
                        {
                            warn!("Docker events monitoring error: {}", e);
                            if docker.ping().await.is_err() {
                                warn!("The engine stopped answering, Nookat will connect again");
                                state.forget_connection().await;
                            }
                            consecutive_failures += 1;

                            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                                error!("Too many consecutive Docker monitoring failures ({}), stopping monitoring", consecutive_failures);
                                break;
                            }

                            let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                            tokio::time::sleep(delay).await;
                        }
                    } else {
                        consecutive_failures += 1;
                        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                            error!("No Docker instance available after {} attempts, stopping monitoring", consecutive_failures);
                            break;
                        }

                        let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                        tokio::time::sleep(delay).await;
                    }
                }
                Err(e) => {
                    consecutive_failures += 1;

                    if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                        error!(
                            "Engine not available after {} attempts: {}. Stopping monitoring.",
                            consecutive_failures, e
                        );
                        break;
                    }

                    let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                    tokio::time::sleep(delay).await;
                }
            }
        }

        info!("Docker events monitoring stopped");
        Ok(())
    }

    async fn monitor_docker_events(
        docker: &Docker,
        connection_forgotten: Notified<'_>,
        state: &Arc<SharedEngineState>,
        last_published: &Arc<Mutex<Option<EngineState>>>,
        app_handle: &tauri::AppHandle,
    ) -> MonitorResult<()> {
        let events = docker.events(Some(EventsOptions::default()));
        let follow_events = follow_events_until_the_stream_breaks(events, move || async move {
            debug!("Docker event received, broadcasting state update");
            if let Err(e) = Self::publish_if_changed(state, last_published, app_handle).await {
                error!("Failed to broadcast updated state: {}", e);
            }
        });

        tokio::select! {
            _ = connection_forgotten => {
                debug!("The engine connection was forgotten, following the new engine's events");
                Ok(())
            }
            followed = follow_events => followed,
        }
    }

    pub async fn publish_current_state(&self) -> MonitorResult<EngineState> {
        let (mut last_published, current) =
            Self::lock_then_read(&self.state, &self.last_published).await?;
        Ok(Self::publish(&mut last_published, current, &self.app_handle)?.clone())
    }

    async fn publish_if_changed(
        state: &SharedEngineState,
        last_published: &Mutex<Option<EngineState>>,
        app_handle: &tauri::AppHandle,
    ) -> MonitorResult<()> {
        let (mut last_published, current) = Self::lock_then_read(state, last_published).await?;

        let changed = last_published
            .as_ref()
            .is_none_or(|previous| Self::has_state_changed(previous, &current));
        if changed {
            let published = Self::publish(&mut last_published, current, app_handle)?;
            debug!(
                "Engine state {} broadcasted via Tauri event",
                published.version
            );
        }

        Ok(())
    }

    async fn lock_then_read<'a>(
        state: &SharedEngineState,
        last_published: &'a Mutex<Option<EngineState>>,
    ) -> MonitorResult<(MutexGuard<'a, Option<EngineState>>, EngineState)> {
        let last_published = last_published.lock().await;
        let engine = state.get_engine().await?;
        let current = Self::read_engine_state(&engine).await?;
        Ok((last_published, current))
    }

    fn publish<'a>(
        last_published: &'a mut MutexGuard<'_, Option<EngineState>>,
        mut snapshot: EngineState,
        app_handle: &tauri::AppHandle,
    ) -> MonitorResult<&'a EngineState> {
        snapshot.version = last_published
            .as_ref()
            .map_or(1, |previous| previous.version + 1);
        app_handle.emit("engine_state_update", &serde_json::to_value(&snapshot)?)?;
        Ok(last_published.insert(snapshot))
    }

    fn has_state_changed(old_state: &EngineState, new_state: &EngineState) -> bool {
        old_state.containers != new_state.containers
            || old_state.images != new_state.images
            || old_state.volumes != new_state.volumes
            || old_state.networks != new_state.networks
            || old_state.engine_status != new_state.engine_status
    }

    async fn read_engine_state(engine: &Engine) -> MonitorResult<EngineState> {
        let Some(docker) = &engine.docker else {
            return Ok(Self::status_only_state(engine));
        };

        let (containers, images, volumes, networks) = tokio::try_join!(
            ContainersService::get_containers(docker),
            ImagesService::get_images(docker),
            VolumesService::get_volumes(docker),
            NetworksService::get_networks(docker)
        )?;

        Ok(EngineState {
            containers: containers_by_id(containers),
            images: keyed_by(images, |image| image.id.clone()),
            volumes: keyed_by(volumes, |volume| volume.name.clone()),
            networks: keyed_by(networks, |network| network.name.clone()),
            engine_status: engine.engine_status.clone(),
            version: UNPUBLISHED_VERSION,
            last_updated: Utc::now(),
        })
    }

    fn status_only_state(engine: &Engine) -> EngineState {
        EngineState {
            engine_status: engine.engine_status.clone(),
            version: UNPUBLISHED_VERSION,
            last_updated: Utc::now(),
            ..EngineState::default()
        }
    }
}

fn log_docker_events_task_exit(outcome: Result<MonitorResult<()>, JoinError>) {
    match outcome {
        Ok(Ok(())) => debug!("Docker events monitoring completed successfully, respawning..."),
        Ok(Err(e)) => warn!("Docker events monitoring failed: {}, respawning...", e),
        Err(e) => error!(
            "Docker events monitoring task panicked: {}, respawning...",
            e
        ),
    }
}

fn containers_by_id(summaries: Vec<ContainerSummary>) -> HashMap<String, Container> {
    summaries
        .into_iter()
        .enumerate()
        .map(|(index, summary)| {
            let container = Container::from(summary);
            let key = container
                .id
                .clone()
                .filter(|id| !id.is_empty())
                .unwrap_or_else(|| format!("container_{index}"));
            (key, container)
        })
        .collect()
}

fn keyed_by<T>(items: Vec<T>, key_of: impl Fn(&T) -> String) -> HashMap<String, T> {
    items
        .into_iter()
        .map(|item| (key_of(&item), item))
        .filter(|(key, _)| !key.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{
        containers_by_id, follow_events_until_the_stream_breaks, keyed_by, EngineStateMonitor,
    };
    use crate::entities::{
        Container, EngineInfo, EngineState, EngineStatus, Image, Network, Volume,
    };
    use bollard::models::{
        ContainerSummary, ContainerSummaryStateEnum as ContainerState, VolumeUsageData,
    };
    use chrono::{Duration as ChronoDuration, Utc};
    use std::collections::HashMap;
    use std::time::Duration;

    #[tokio::test]
    async fn a_failing_events_stream_ends_the_watch_instead_of_spinning() {
        let endless_errors =
            futures_util::stream::repeat_with(|| Err::<(), _>("connection refused"));
        let mut reactions = 0;

        let watch = follow_events_until_the_stream_breaks(endless_errors, || {
            reactions += 1;
            async {}
        });
        let result = tokio::time::timeout(Duration::from_secs(1), watch).await;

        assert!(result
            .expect("the watch spins on a failing stream")
            .is_err());
        assert_eq!(reactions, 0);
    }

    #[tokio::test]
    async fn reacts_to_every_event_and_reports_a_stream_that_ends_as_a_lost_engine() {
        let events = futures_util::stream::iter([Ok::<_, &str>(()), Ok(())]);
        let mut reactions = 0;

        let result = follow_events_until_the_stream_breaks(events, || {
            reactions += 1;
            async {}
        })
        .await;

        assert_eq!(reactions, 2);
        assert!(result.is_err());
    }

    fn container(id: &str, state: ContainerState) -> Container {
        Container::from(ContainerSummary {
            id: Some(id.to_string()),
            state: Some(state),
            ..Default::default()
        })
    }

    fn with_containers(containers: &[(&str, ContainerState)]) -> EngineState {
        EngineState {
            containers: containers
                .iter()
                .map(|(id, state)| (id.to_string(), container(id, *state)))
                .collect(),
            ..EngineState::default()
        }
    }

    #[test]
    fn a_container_changing_state_is_a_change() {
        let before = with_containers(&[("a", ContainerState::RUNNING)]);
        let after = with_containers(&[("a", ContainerState::EXITED)]);

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn a_container_replaced_by_another_is_a_change_even_when_the_count_holds() {
        let before = with_containers(&[("a", ContainerState::RUNNING)]);
        let after = with_containers(&[("b", ContainerState::RUNNING)]);

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn an_engine_status_change_is_a_change() {
        let before = EngineState::default();
        let after = EngineState {
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            ..EngineState::default()
        };

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn an_identical_snapshot_is_not_a_change() {
        let snapshot = with_containers(&[("a", ContainerState::RUNNING)]);

        assert!(!EngineStateMonitor::has_state_changed(
            &snapshot,
            &snapshot.clone()
        ));
    }

    fn named_container(name: &str) -> Container {
        Container::from(ContainerSummary {
            id: Some("a".to_string()),
            names: Some(vec![name.to_string()]),
            state: Some(ContainerState::RUNNING),
            ..Default::default()
        })
    }

    fn image(id: &str) -> Image {
        Image {
            id: id.to_string(),
            repository: None,
            tag: None,
            image_id: id.to_string(),
            created: 0,
            size: 0,
            in_use: false,
            dangling: false,
        }
    }

    fn network(in_use: bool) -> Network {
        Network::from_summary(
            bollard::models::Network {
                name: Some("net".into()),
                ..Default::default()
            },
            in_use,
        )
    }

    fn volume_with_ref_count(ref_count: i64) -> Volume {
        Volume::from(bollard::models::Volume {
            name: "vol".into(),
            usage_data: Some(VolumeUsageData { size: 0, ref_count }),
            ..Default::default()
        })
    }

    #[test]
    fn a_renamed_container_is_a_change() {
        let before = EngineState {
            containers: HashMap::from([("a".to_string(), named_container("/a"))]),
            ..EngineState::default()
        };
        let after = EngineState {
            containers: HashMap::from([("a".to_string(), named_container("/b"))]),
            ..EngineState::default()
        };

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn an_image_replaced_by_another_is_a_change_even_when_the_count_holds() {
        let before = EngineState {
            images: HashMap::from([("sha256:a".to_string(), image("sha256:a"))]),
            ..EngineState::default()
        };
        let after = EngineState {
            images: HashMap::from([("sha256:b".to_string(), image("sha256:b"))]),
            ..EngineState::default()
        };

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn a_network_coming_into_use_is_a_change() {
        let before = EngineState {
            networks: HashMap::from([("net".to_string(), network(false))]),
            ..EngineState::default()
        };
        let after = EngineState {
            networks: HashMap::from([("net".to_string(), network(true))]),
            ..EngineState::default()
        };

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn a_volume_whose_usage_changes_is_a_change() {
        let before = EngineState {
            volumes: HashMap::from([("vol".to_string(), volume_with_ref_count(0))]),
            ..EngineState::default()
        };
        let after = EngineState {
            volumes: HashMap::from([("vol".to_string(), volume_with_ref_count(1))]),
            ..EngineState::default()
        };

        assert!(EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn a_new_snapshot_with_the_same_content_is_not_a_change() {
        let before = EngineState {
            containers: HashMap::from([("a".to_string(), named_container("/a"))]),
            images: HashMap::from([("sha256:a".to_string(), image("sha256:a"))]),
            volumes: HashMap::from([("vol".to_string(), volume_with_ref_count(1))]),
            networks: HashMap::from([("net".to_string(), network(true))]),
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            version: 1,
            last_updated: Utc::now(),
        };
        let after = EngineState {
            version: 2,
            last_updated: before.last_updated + ChronoDuration::seconds(5),
            ..before.clone()
        };

        assert!(!EngineStateMonitor::has_state_changed(&before, &after));
    }

    #[test]
    fn containers_without_an_id_get_a_positional_key() {
        let containers = containers_by_id(vec![
            ContainerSummary {
                id: Some("abc".to_string()),
                ..Default::default()
            },
            ContainerSummary {
                id: Some(String::new()),
                ..Default::default()
            },
            ContainerSummary::default(),
        ]);

        let mut keys: Vec<_> = containers.keys().cloned().collect();
        keys.sort();
        assert_eq!(keys, ["abc", "container_1", "container_2"]);
    }

    #[test]
    fn items_with_an_empty_key_are_left_out() {
        let names = keyed_by(vec!["vol-a".to_string(), String::new()], |name| {
            name.clone()
        });

        assert_eq!(
            names,
            HashMap::from([("vol-a".to_string(), "vol-a".to_string())])
        );
    }
}
