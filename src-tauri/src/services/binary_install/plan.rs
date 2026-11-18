use super::{bin_dir, ReleaseArtifact};
use crate::entities::{BinaryComponent, BinaryInstallPlan};
use std::path::Path;

pub fn install_plan(releases: &[ReleaseArtifact], prefix: &Path) -> BinaryInstallPlan {
    BinaryInstallPlan {
        install_dir: prefix.display().to_string(),
        bin_dir: bin_dir(prefix).display().to_string(),
        components: releases
            .iter()
            .map(|release| BinaryComponent {
                name: release.name.to_string(),
                version: release.version.to_string(),
            })
            .collect(),
        download_bytes: releases.iter().map(|release| release.download_bytes).sum(),
        installed_bytes: releases.iter().map(|release| release.unpacked_bytes).sum(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::ColimaArchitecture;
    use crate::services::binary_install::pinned_releases;
    use serde_json::json;

    #[test]
    fn describes_what_the_binary_installation_puts_where_in_the_shape_the_frontend_reads() {
        let plan = install_plan(
            &pinned_releases(ColimaArchitecture::Aarch64),
            Path::new("/Users/me/.nookat/engine"),
        );

        assert_eq!(
            serde_json::to_value(plan).unwrap(),
            json!({
                "install_dir": "/Users/me/.nookat/engine",
                "bin_dir": "/Users/me/.nookat/engine/bin",
                "components": [
                    { "name": "Colima", "version": "0.10.3" },
                    { "name": "Lima", "version": "2.2.1" },
                    { "name": "Docker CLI", "version": "29.10.0" }
                ],
                "download_bytes": 64_315_959,
                "installed_bytes": 130_450_970
            })
        );
    }
}
