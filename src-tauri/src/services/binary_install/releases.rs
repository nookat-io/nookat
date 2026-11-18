use crate::entities::ColimaArchitecture;
use std::borrow::Cow;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ArtifactLayout {
    Executable {
        install_as: &'static str,
    },
    PrefixArchive,
    ArchivedExecutable {
        path_in_archive: &'static str,
        install_as: &'static str,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReleaseArtifact {
    pub name: &'static str,
    pub version: &'static str,
    pub url: Cow<'static, str>,
    pub sha256: Cow<'static, str>,
    pub download_bytes: u64,
    pub unpacked_bytes: u64,
    pub layout: ArtifactLayout,
    pub check_command: &'static str,
}

const COLIMA: &str = "Colima";
const COLIMA_VERSION: &str = "0.10.3";
const LIMA: &str = "Lima";
const LIMA_VERSION: &str = "2.2.1";
const DOCKER_CLI: &str = "Docker CLI";
const DOCKER_CLI_VERSION: &str = "29.10.0";

const COLIMA_EXECUTABLE: ArtifactLayout = ArtifactLayout::Executable {
    install_as: "colima",
};
const DOCKER_CLI_EXECUTABLE: ArtifactLayout = ArtifactLayout::ArchivedExecutable {
    path_in_archive: "docker/docker",
    install_as: "docker",
};

const APPLE_SILICON_RELEASES: [ReleaseArtifact; 3] = [
    ReleaseArtifact {
        name: COLIMA,
        version: COLIMA_VERSION,
        url: Cow::Borrowed(
            "https://github.com/abiosoft/colima/releases/download/v0.10.3/colima-Darwin-arm64",
        ),
        sha256: Cow::Borrowed("980ad8bf61a4ca370243f4cb41401a61276dcd2c2502bee7b9b86f9250169f34"),
        download_bytes: 15_656_320,
        unpacked_bytes: 15_656_320,
        layout: COLIMA_EXECUTABLE,
        check_command: "colima",
    },
    ReleaseArtifact {
        name: LIMA,
        version: LIMA_VERSION,
        url: Cow::Borrowed(
            "https://github.com/lima-vm/lima/releases/download/v2.2.1/lima-2.2.1-Darwin-arm64.tar.gz",
        ),
        sha256: Cow::Borrowed("9e9eacce88f37e185c346bad73aa6136f738d8cdf8c3bb23cd42b071824bc66e"),
        download_bytes: 38_328_082,
        unpacked_bytes: 81_620_424,
        layout: ArtifactLayout::PrefixArchive,
        check_command: "limactl",
    },
    ReleaseArtifact {
        name: DOCKER_CLI,
        version: DOCKER_CLI_VERSION,
        url: Cow::Borrowed(
            "https://download.docker.com/mac/static/stable/aarch64/docker-29.10.0.tgz",
        ),
        sha256: Cow::Borrowed("84025e01f7716eb8bd1064c49a9d2b3a38547fa963983e81017c73ee8c5d540b"),
        download_bytes: 10_331_557,
        unpacked_bytes: 33_174_226,
        layout: DOCKER_CLI_EXECUTABLE,
        check_command: "docker",
    },
];

const INTEL_RELEASES: [ReleaseArtifact; 3] = [
    ReleaseArtifact {
        name: COLIMA,
        version: COLIMA_VERSION,
        url: Cow::Borrowed(
            "https://github.com/abiosoft/colima/releases/download/v0.10.3/colima-Darwin-x86_64",
        ),
        sha256: Cow::Borrowed("3082737fe8a98afda11cba7d9a20b6e56fe80c6153464beda04bec630758770b"),
        download_bytes: 16_954_240,
        unpacked_bytes: 16_954_240,
        layout: COLIMA_EXECUTABLE,
        check_command: "colima",
    },
    ReleaseArtifact {
        name: LIMA,
        version: LIMA_VERSION,
        url: Cow::Borrowed(
            "https://github.com/lima-vm/lima/releases/download/v2.2.1/lima-2.2.1-Darwin-x86_64.tar.gz",
        ),
        sha256: Cow::Borrowed("6b776e4bc41f358e6ee01fefcc78e2eb26f11635a0fcff632234af77a566c6c4"),
        download_bytes: 24_958_659,
        unpacked_bytes: 51_622_918,
        layout: ArtifactLayout::PrefixArchive,
        check_command: "limactl",
    },
    ReleaseArtifact {
        name: DOCKER_CLI,
        version: DOCKER_CLI_VERSION,
        url: Cow::Borrowed(
            "https://download.docker.com/mac/static/stable/x86_64/docker-29.10.0.tgz",
        ),
        sha256: Cow::Borrowed("18fd600a2fc0bc2e62f34f66b0fd717dc2a774aa533bf3cef98011b9d37e0459"),
        download_bytes: 11_235_689,
        unpacked_bytes: 35_134_512,
        layout: DOCKER_CLI_EXECUTABLE,
        check_command: "docker",
    },
];

pub fn pinned_releases(architecture: ColimaArchitecture) -> Vec<ReleaseArtifact> {
    match architecture {
        ColimaArchitecture::Aarch64 => APPLE_SILICON_RELEASES.to_vec(),
        ColimaArchitecture::X86_64 => INTEL_RELEASES.to_vec(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn every_release() -> Vec<ReleaseArtifact> {
        [ColimaArchitecture::Aarch64, ColimaArchitecture::X86_64]
            .into_iter()
            .flat_map(pinned_releases)
            .collect()
    }

    #[test]
    fn installs_colima_lima_and_the_docker_cli_colima_needs_for_its_docker_runtime() {
        for architecture in [ColimaArchitecture::Aarch64, ColimaArchitecture::X86_64] {
            let names: Vec<&str> = pinned_releases(architecture)
                .into_iter()
                .map(|release| release.name)
                .collect();
            assert_eq!(names, ["Colima", "Lima", "Docker CLI"]);
        }
    }

    #[test]
    fn every_download_is_pinned_to_a_sha256_digest() {
        for release in every_release() {
            assert_eq!(release.sha256.len(), 64, "{}", release.url);
            assert!(
                release
                    .sha256
                    .chars()
                    .all(|c| c.is_ascii_digit() || ('a'..='f').contains(&c)),
                "{}",
                release.url
            );
        }
    }

    #[test]
    fn every_download_comes_from_an_official_https_release_of_its_version() {
        let official_sources = [
            "https://github.com/abiosoft/colima/releases/download/",
            "https://github.com/lima-vm/lima/releases/download/",
            "https://download.docker.com/mac/static/stable/",
        ];

        for release in every_release() {
            assert!(
                official_sources
                    .iter()
                    .any(|source| release.url.starts_with(source)),
                "{}",
                release.url
            );
            assert!(release.url.contains(release.version), "{}", release.url);
        }
    }

    #[test]
    fn downloads_match_the_architecture_of_the_mac() {
        assert!(pinned_releases(ColimaArchitecture::Aarch64)
            .iter()
            .all(|release| release.url.contains("arm64") || release.url.contains("aarch64")));
        assert!(pinned_releases(ColimaArchitecture::X86_64)
            .iter()
            .all(|release| release.url.contains("x86_64")));
    }
}
