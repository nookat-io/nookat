use crate::entities::{ImagePullLayer, ImagePullPhase, ImagePullProgress};
use bollard::models::CreateImageInfo;

#[derive(Default, Debug)]
pub(crate) struct PullLayers {
    layers: Vec<ImagePullLayer>,
}

impl PullLayers {
    pub(crate) fn apply(&mut self, info: &CreateImageInfo) -> bool {
        let (Some(id), Some(phase)) = (
            info.id.as_deref(),
            info.status.as_deref().and_then(layer_phase),
        ) else {
            return false;
        };
        let detail = info.progress_detail.as_ref();
        let current = detail.and_then(|detail| byte_count(detail.current));
        let total = detail
            .and_then(|detail| byte_count(detail.total))
            .filter(|total| *total > 0);

        let before = self.layers.iter().find(|layer| layer.id == id).cloned();
        let layer = self.layer_mut(id);
        layer.phase = phase;
        if total.is_some() {
            layer.size = total;
        }
        match phase {
            ImagePullPhase::Downloading => {
                layer.downloaded = current.unwrap_or(layer.downloaded);
            }
            ImagePullPhase::Downloaded => {
                layer.downloaded = layer.size.unwrap_or(layer.downloaded);
            }
            ImagePullPhase::Extracting => {
                layer.downloaded = layer.size.unwrap_or(layer.downloaded);
                layer.extracted = current.unwrap_or(layer.extracted);
            }
            ImagePullPhase::Complete => {
                if let Some(size) = layer.size {
                    layer.downloaded = size;
                    layer.extracted = size;
                }
            }
            ImagePullPhase::Pending | ImagePullPhase::AlreadyExists => {}
        }
        before.as_ref() != Some(layer)
    }

    pub(crate) fn progress(&self) -> ImagePullProgress {
        ImagePullProgress {
            layers: self.layers.clone(),
        }
    }

    fn layer_mut(&mut self, id: &str) -> &mut ImagePullLayer {
        let index = match self.layers.iter().position(|layer| layer.id == id) {
            Some(index) => index,
            None => {
                self.layers.push(ImagePullLayer {
                    id: id.to_string(),
                    phase: ImagePullPhase::Pending,
                    size: None,
                    downloaded: 0,
                    extracted: 0,
                });
                self.layers.len() - 1
            }
        };
        &mut self.layers[index]
    }
}

fn layer_phase(status: &str) -> Option<ImagePullPhase> {
    match status {
        "Pulling fs layer" | "Waiting" => Some(ImagePullPhase::Pending),
        "Downloading" => Some(ImagePullPhase::Downloading),
        "Verifying Checksum" | "Download complete" => Some(ImagePullPhase::Downloaded),
        "Extracting" => Some(ImagePullPhase::Extracting),
        "Pull complete" => Some(ImagePullPhase::Complete),
        "Already exists" => Some(ImagePullPhase::AlreadyExists),
        _ => None,
    }
}

fn byte_count(value: Option<i64>) -> Option<u64> {
    value.and_then(|value| u64::try_from(value).ok())
}

#[cfg(test)]
mod tests {
    use super::PullLayers;
    use crate::entities::{ImagePullLayer, ImagePullPhase};
    use bollard::models::{CreateImageInfo, ProgressDetail};

    fn message(id: &str, status: &str) -> CreateImageInfo {
        CreateImageInfo {
            id: Some(id.to_string()),
            status: Some(status.to_string()),
            ..Default::default()
        }
    }

    fn with_bytes(id: &str, status: &str, current: i64, total: i64) -> CreateImageInfo {
        CreateImageInfo {
            progress_detail: Some(ProgressDetail {
                current: Some(current),
                total: Some(total),
            }),
            ..message(id, status)
        }
    }

    fn layer(
        id: &str,
        phase: ImagePullPhase,
        size: Option<u64>,
        downloaded: u64,
        extracted: u64,
    ) -> ImagePullLayer {
        ImagePullLayer {
            id: id.to_string(),
            phase,
            size,
            downloaded,
            extracted,
        }
    }

    fn apply_all(messages: &[CreateImageInfo]) -> PullLayers {
        let mut layers = PullLayers::default();
        for message in messages {
            layers.apply(message);
        }
        layers
    }

    #[test]
    fn layers_are_listed_in_the_order_the_engine_announces_them() {
        let layers = apply_all(&[
            message("1.23-alpine", "Pulling from library/golang"),
            message("6e174226ea69", "Pulling fs layer"),
            message("382d65ac76eb", "Pulling fs layer"),
            message("13eebdc497b7", "Pulling fs layer"),
            message("13eebdc497b7", "Waiting"),
            message("ea0f1c9e5d1a", "Already exists"),
        ]);

        assert_eq!(
            layers.progress().layers,
            vec![
                layer("6e174226ea69", ImagePullPhase::Pending, None, 0, 0),
                layer("382d65ac76eb", ImagePullPhase::Pending, None, 0, 0),
                layer("13eebdc497b7", ImagePullPhase::Pending, None, 0, 0),
                layer("ea0f1c9e5d1a", ImagePullPhase::AlreadyExists, None, 0, 0),
            ]
        );
    }

    #[test]
    fn a_layer_learns_its_size_once_its_download_starts() {
        let layers = apply_all(&[
            message("382d65ac76eb", "Pulling fs layer"),
            with_bytes("382d65ac76eb", "Downloading", 537_755, 70_699_308),
            with_bytes("382d65ac76eb", "Downloading", 27_899_201, 70_699_308),
        ]);

        assert_eq!(
            layers.progress().layers,
            vec![layer(
                "382d65ac76eb",
                ImagePullPhase::Downloading,
                Some(70_699_308),
                27_899_201,
                0
            )]
        );
    }

    #[test]
    fn a_layer_counts_its_whole_size_downloaded_before_it_is_extracted() {
        let layers = apply_all(&[
            with_bytes("6e174226ea69", "Downloading", 48_508, 4_130_750),
            message("6e174226ea69", "Verifying Checksum"),
            message("6e174226ea69", "Download complete"),
            with_bytes("6e174226ea69", "Extracting", 65_536, 4_130_750),
        ]);

        assert_eq!(
            layers.progress().layers,
            vec![layer(
                "6e174226ea69",
                ImagePullPhase::Extracting,
                Some(4_130_750),
                4_130_750,
                65_536
            )]
        );
    }

    #[test]
    fn a_complete_layer_is_fully_downloaded_and_extracted() {
        let layers = apply_all(&[
            with_bytes("7d1a427e917c", "Downloading", 16_384, 284_709),
            message("7d1a427e917c", "Download complete"),
            with_bytes("7d1a427e917c", "Extracting", 32_768, 284_709),
            message("7d1a427e917c", "Pull complete"),
        ]);

        assert_eq!(
            layers.progress().layers,
            vec![layer(
                "7d1a427e917c",
                ImagePullPhase::Complete,
                Some(284_709),
                284_709,
                284_709
            )]
        );
    }

    #[test]
    fn a_layer_without_download_progress_learns_its_size_from_extraction() {
        let layers = apply_all(&[
            message("4f4fb700ef54", "Pulling fs layer"),
            message("4f4fb700ef54", "Download complete"),
            with_bytes("4f4fb700ef54", "Extracting", 32, 32),
        ]);

        assert_eq!(
            layers.progress().layers,
            vec![layer(
                "4f4fb700ef54",
                ImagePullPhase::Extracting,
                Some(32),
                32,
                32
            )]
        );
    }

    #[test]
    fn only_messages_that_change_a_layer_count_as_progress() {
        let mut layers = PullLayers::default();

        assert!(!layers.apply(&message("1.23-alpine", "Pulling from library/golang")));
        assert!(layers.apply(&message("13eebdc497b7", "Pulling fs layer")));
        assert!(!layers.apply(&message("13eebdc497b7", "Waiting")));
        assert!(!layers.apply(&message("13eebdc497b7", "Retrying in 5 seconds")));
        assert!(layers.apply(&with_bytes("13eebdc497b7", "Downloading", 10, 126)));
        assert!(!layers.apply(&with_bytes("13eebdc497b7", "Downloading", 10, 126)));
        assert!(!layers.apply(&CreateImageInfo {
            status: Some("Digest: sha256:3833".to_string()),
            ..Default::default()
        }));
    }
}
