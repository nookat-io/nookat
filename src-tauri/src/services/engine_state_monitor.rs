use crate::entities::{Container, Engine, EngineState, Image};
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
use tokio::sync::{Mutex, MutexGuard};
use tokio::task::{JoinError, JoinHandle, JoinSet};
use tracing::{debug, error, warn};

type MonitorResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

struct BrokenStream {
    cause: Box<dyn std::error::Error + Send + Sync>,
    delivered_events: bool,
}

async fn follow_events_until_the_stream_breaks<T, E, Reaction>(
    events: impl Stream<Item = Result<T, E>>,
    mut react: impl FnMut() -> Reaction,
) -> BrokenStream
where
    E: Into<Box<dyn std::error::Error + Send + Sync>>,
    Reaction: Future<Output = ()>,
{
    futures_util::pin_mut!(events);
    let mut delivered_events = false;
    while let Some(event) = events.next().await {
        if let Err(e) = event {
            return BrokenStream {
                cause: e.into(),
                delivered_events,
            };
        }
        delivered_events = true;
        react().await;
    }
    BrokenStream {
        cause: "The Docker events stream ended".into(),
        delivered_events,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EventsWatchOutcome {
    NoEngine,
    BrokeBeforeAnyEvent,
    BrokeAfterEvents,
    EngineChanged,
}

const FIRST_RETRY_DELAY: Duration = Duration::from_secs(2);
const LONGEST_RETRY_DELAY: Duration = Duration::from_secs(16);

struct RetryDelay {
    next: Duration,
}

impl RetryDelay {
    fn new() -> Self {
        Self {
            next: FIRST_RETRY_DELAY,
        }
    }

    fn reset(&mut self) {
        self.next = FIRST_RETRY_DELAY;
    }

    fn take(&mut self) -> Duration {
        let delay = self.next;
        self.next = (delay * 2).min(LONGEST_RETRY_DELAY);
        delay
    }
}

async fn keep_following_events<Attempt, Wait>(
    mut attempt: impl FnMut() -> Attempt,
    mut wait: impl FnMut(Duration) -> Wait,
) where
    Attempt: Future<Output = EventsWatchOutcome>,
    Wait: Future<Output = ()>,
{
    let mut delay = RetryDelay::new();
    loop {
        match attempt().await {
            EventsWatchOutcome::EngineChanged => delay.reset(),
            EventsWatchOutcome::BrokeAfterEvents => {
                delay.reset();
                wait(delay.take()).await;
            }
            EventsWatchOutcome::NoEngine | EventsWatchOutcome::BrokeBeforeAnyEvent => {
                wait(delay.take()).await;
            }
        }
    }
}

#[derive(Default)]
struct MonitorTask {
    handle: Mutex<Option<JoinHandle<()>>>,
}

impl MonitorTask {
    async fn start_unless_running(&self, spawn: impl FnOnce() -> JoinHandle<()>) {
        let mut handle = self.handle.lock().await;

        match handle.take() {
            Some(running) if !running.is_finished() => {
                debug!("Engine state monitoring already running");
                *handle = Some(running);
                return;
            }
            Some(finished) => log_monitor_loop_exit(finished.await),
            None => {}
        }

        *handle = Some(spawn());
        debug!("Engine state monitoring started");
    }

    #[cfg(test)]
    async fn has_finished(&self) -> bool {
        self.handle
            .lock()
            .await
            .as_ref()
            .is_some_and(JoinHandle::is_finished)
    }
}

fn log_monitor_loop_exit(outcome: Result<(), JoinError>) {
    match outcome {
        Ok(()) => error!("Engine state monitoring ended, starting it again"),
        Err(e) => error!(
            "Engine state monitoring task failed: {}, starting it again",
            e
        ),
    }
}

const POLL_INTERVAL: Duration = Duration::from_secs(5);
const UNPUBLISHED_VERSION: u64 = 0;

pub struct EngineStateMonitor {
    state: Arc<SharedEngineState>,
    monitor_task: MonitorTask,
    last_published: Arc<Mutex<Option<EngineState>>>,
    app_handle: tauri::AppHandle,
}

impl EngineStateMonitor {
    pub fn new(state: Arc<SharedEngineState>, app_handle: tauri::AppHandle) -> Self {
        Self {
            state,
            monitor_task: MonitorTask::default(),
            last_published: Arc::new(Mutex::new(None)),
            app_handle,
        }
    }

    pub async fn start_monitoring(&self) {
        self.monitor_task
            .start_unless_running(|| {
                tokio::spawn(Self::monitor_loop(
                    self.state.clone(),
                    self.last_published.clone(),
                    self.app_handle.clone(),
                ))
            })
            .await;
    }

    async fn monitor_loop(
        state: Arc<SharedEngineState>,
        last_published: Arc<Mutex<Option<EngineState>>>,
        app_handle: tauri::AppHandle,
    ) {
        let follow_docker_events = || {
            Self::monitor_docker_events_continuously(
                state.clone(),
                last_published.clone(),
                app_handle.clone(),
            )
        };
        let mut docker_events = JoinSet::new();
        docker_events.spawn(follow_docker_events());

        if let Err(e) = Self::publish_if_changed(&state, &last_published, &app_handle).await {
            warn!("Initial baseline snapshot error: {}", e);
        }

        let mut poll_interval = tokio::time::interval(POLL_INTERVAL);

        loop {
            poll_interval.tick().await;

            if let Some(exit) = docker_events.try_join_next() {
                log_docker_events_task_exit(exit);
                docker_events.spawn(follow_docker_events());
            }

            if let Err(e) = Self::publish_if_changed(&state, &last_published, &app_handle).await {
                warn!("State change check error: {}", e);
            }
        }
    }

    async fn monitor_docker_events_continuously(
        state: Arc<SharedEngineState>,
        last_published: Arc<Mutex<Option<EngineState>>>,
        app_handle: tauri::AppHandle,
    ) {
        keep_following_events(
            || Self::follow_docker_events_once(&state, &last_published, &app_handle),
            tokio::time::sleep,
        )
        .await
    }

    async fn follow_docker_events_once(
        state: &Arc<SharedEngineState>,
        last_published: &Arc<Mutex<Option<EngineState>>>,
        app_handle: &tauri::AppHandle,
    ) -> EventsWatchOutcome {
        let connection_forgotten = state.connection_forgotten();
        let engine = match state.get_engine().await {
            Ok(engine) => engine,
            Err(e) => {
                warn!("The engine is not available: {}", e);
                return EventsWatchOutcome::NoEngine;
            }
        };
        let Some(docker) = &engine.docker else {
            debug!("No engine runs, waiting before following its events");
            return EventsWatchOutcome::NoEngine;
        };

        let events = docker.events(Some(EventsOptions::default()));
        let follow_events = follow_events_until_the_stream_breaks(events, move || async move {
            debug!("Docker event received, broadcasting state update");
            if let Err(e) = Self::publish_if_changed(state, last_published, app_handle).await {
                error!("Failed to broadcast updated state: {}", e);
            }
        });

        let broken = tokio::select! {
            _ = connection_forgotten => {
                debug!("The engine connection was forgotten, following the new engine's events");
                return EventsWatchOutcome::EngineChanged;
            }
            broken = follow_events => broken,
        };

        warn!("Docker events monitoring error: {}", broken.cause);
        if docker.ping().await.is_err() {
            warn!("The engine stopped answering, Nookat will connect again");
            state.forget_connection().await;
        }

        if broken.delivered_events {
            EventsWatchOutcome::BrokeAfterEvents
        } else {
            EventsWatchOutcome::BrokeBeforeAnyEvent
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

        let ((containers, images), volumes, networks) = tokio::try_join!(
            Self::read_containers_then_images(docker),
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

    async fn read_containers_then_images(
        docker: &Docker,
    ) -> Result<(Vec<ContainerSummary>, Vec<Image>), String> {
        let containers = ContainersService::get_containers(docker).await?;
        let images = ImagesService::get_images(docker, &containers).await?;
        Ok((containers, images))
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

fn log_docker_events_task_exit(outcome: Result<(), JoinError>) {
    match outcome {
        Ok(()) => error!("Docker events monitoring ended, starting it again"),
        Err(e) => error!(
            "Docker events monitoring task failed: {}, starting it again",
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
        containers_by_id, follow_events_until_the_stream_breaks, keep_following_events, keyed_by,
        EngineStateMonitor, EventsWatchOutcome, MonitorTask,
    };
    use crate::entities::{
        Container, EngineInfo, EngineState, EngineStatus, Image, Network, Volume,
    };
    use bollard::models::{
        ContainerSummary, ContainerSummaryStateEnum as ContainerState, VolumeUsageData,
    };
    use chrono::{Duration as ChronoDuration, Utc};
    use std::cell::{Cell, RefCell};
    use std::collections::HashMap;
    use std::collections::VecDeque;
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
        let broken = tokio::time::timeout(Duration::from_secs(1), watch)
            .await
            .expect("the watch spins on a failing stream");

        assert_eq!(broken.cause.to_string(), "connection refused");
        assert!(!broken.delivered_events);
        assert_eq!(reactions, 0);
    }

    #[tokio::test]
    async fn reacts_to_every_event_and_reports_a_stream_that_ends_as_a_lost_engine() {
        let events = futures_util::stream::iter([Ok::<_, &str>(()), Ok(())]);
        let mut reactions = 0;

        let broken = follow_events_until_the_stream_breaks(events, || {
            reactions += 1;
            async {}
        })
        .await;

        assert_eq!(reactions, 2);
        assert!(broken.delivered_events);
    }

    async fn waits_between_tries(outcomes: &[EventsWatchOutcome]) -> (Vec<Duration>, usize) {
        let scripted = RefCell::new(outcomes.iter().copied().collect::<VecDeque<_>>());
        let tries = Cell::new(0);
        let waits = RefCell::new(Vec::new());

        let attempt = || {
            tries.set(tries.get() + 1);
            let next = scripted.borrow_mut().pop_front();
            async move {
                match next {
                    Some(outcome) => outcome,
                    None => std::future::pending().await,
                }
            }
        };
        let wait = |delay| {
            waits.borrow_mut().push(delay);
            async {}
        };

        let following = keep_following_events(attempt, wait);
        assert!(tokio::time::timeout(Duration::from_secs(1), following)
            .await
            .is_err());

        let scripted_tries = tries.get() - 1;
        (waits.into_inner(), scripted_tries)
    }

    fn seconds(values: &[u64]) -> Vec<Duration> {
        values.iter().copied().map(Duration::from_secs).collect()
    }

    #[tokio::test]
    async fn keeps_following_after_five_tries_without_an_engine() {
        let (waits, tries) = waits_between_tries(&[EventsWatchOutcome::NoEngine; 7]).await;

        assert_eq!(tries, 7);
        assert_eq!(waits, seconds(&[2, 4, 8, 16, 16, 16, 16]));
    }

    #[tokio::test]
    async fn a_stream_that_breaks_before_any_event_keeps_the_delay_growing() {
        let (waits, _) = waits_between_tries(&[EventsWatchOutcome::BrokeBeforeAnyEvent; 3]).await;

        assert_eq!(waits, seconds(&[2, 4, 8]));
    }

    #[tokio::test]
    async fn a_stream_that_delivered_events_starts_the_delay_again() {
        let (waits, _) = waits_between_tries(&[
            EventsWatchOutcome::BrokeBeforeAnyEvent,
            EventsWatchOutcome::BrokeBeforeAnyEvent,
            EventsWatchOutcome::BrokeAfterEvents,
            EventsWatchOutcome::BrokeBeforeAnyEvent,
        ])
        .await;

        assert_eq!(waits, seconds(&[2, 4, 2, 4]));
    }

    #[tokio::test]
    async fn a_changed_engine_is_followed_without_waiting() {
        let (waits, tries) = waits_between_tries(&[
            EventsWatchOutcome::BrokeBeforeAnyEvent,
            EventsWatchOutcome::EngineChanged,
            EventsWatchOutcome::BrokeBeforeAnyEvent,
        ])
        .await;

        assert_eq!(tries, 3);
        assert_eq!(waits, seconds(&[2, 2]));
    }

    #[tokio::test]
    async fn a_running_monitor_is_not_started_twice() {
        let monitor = MonitorTask::default();
        let starts = Cell::new(0);
        let spawn = || {
            starts.set(starts.get() + 1);
            tokio::spawn(std::future::pending())
        };

        monitor.start_unless_running(spawn).await;
        monitor.start_unless_running(spawn).await;

        assert_eq!(starts.get(), 1);
    }

    #[tokio::test]
    async fn a_monitor_whose_task_ended_is_started_again() {
        let monitor = MonitorTask::default();
        let starts = Cell::new(0);
        let spawn = || {
            starts.set(starts.get() + 1);
            tokio::spawn(async { panic!("the monitor loop broke") })
        };

        monitor.start_unless_running(spawn).await;
        tokio::time::timeout(Duration::from_secs(1), async {
            while !monitor.has_finished().await {
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("the panicking monitor loop never finished");
        monitor.start_unless_running(spawn).await;

        assert_eq!(starts.get(), 2);
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

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::super::EngineStateMonitor;
        use crate::entities::{Engine, EngineInfo, EngineStatus};
        use crate::services::fake_docker_daemon::{http_response, request_lines, serve_daemon};
        use bollard::Docker;

        const CONTAINERS: &str = r#"[{"Id":"web-1","ImageID":"sha256:web","Names":["/web"]}]"#;
        const IMAGES: &str = r#"[{"Id":"sha256:web","ParentId":"","RepoTags":["web:latest"],"RepoDigests":[],"Created":0,"Size":0,"SharedSize":-1,"Labels":{},"Containers":-1}]"#;

        fn answer(request: &str) -> String {
            let path = request.split_whitespace().nth(1).unwrap_or_default();
            let body = if path.contains("/containers/json") {
                CONTAINERS
            } else if path.contains("/images/json") {
                IMAGES
            } else if path.contains("/volumes") {
                r#"{"Volumes":[],"Warnings":[]}"#
            } else {
                "[]"
            };
            http_response("200 OK", "application/json", body)
        }

        #[tokio::test]
        async fn a_snapshot_never_asks_the_daemon_for_container_sizes() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, answer);
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();
            let engine = Engine {
                engine_status: EngineStatus::Running(EngineInfo::Docker),
                docker: Some(docker),
                endpoint: None,
            };

            let state = EngineStateMonitor::read_engine_state(&engine)
                .await
                .unwrap();

            let lines = request_lines(&requests);
            assert!(
                lines.iter().all(|line| !line.contains("size=true")),
                "{lines:?}"
            );
            let web = state
                .images
                .values()
                .find(|image| image.image_id == "sha256:web")
                .expect("the image sha256:web is listed");
            assert!(web.in_use);
        }
    }
}
