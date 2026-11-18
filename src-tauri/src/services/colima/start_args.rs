use super::{default_settings, rosetta_applies, vm_type_for};
use crate::entities::{
    ColimaArchitecture, ColimaHost, ColimaVmSettings, ColimaVmSettingsChanges, ColimaVmType,
};
use std::fmt::Display;

const PORT_FORWARDER: &str = "ssh";

pub fn colima_start_args(
    profile: &str,
    existing: Option<&ColimaVmSettings>,
    changes: &ColimaVmSettingsChanges,
    host: &ColimaHost,
) -> Vec<String> {
    let profile_flags = match existing {
        None => fresh_profile_flags(changes, host),
        Some(current) => existing_profile_flags(current, changes, host),
    };

    ["start".to_string(), flag("--profile", profile)]
        .into_iter()
        .chain(profile_flags)
        .collect()
}

fn fresh_profile_flags(changes: &ColimaVmSettingsChanges, host: &ColimaHost) -> Vec<String> {
    let defaults = default_settings(host);
    let architecture = changes.architecture.unwrap_or(defaults.architecture);
    let vm_type = vm_type_for(architecture, host);

    let resources = [
        flag("--cpus", changes.cpus.unwrap_or(defaults.cpus)),
        flag(
            "--memory",
            changes.memory_gib.unwrap_or(defaults.memory_gib),
        ),
        flag("--disk", changes.disk_gib.unwrap_or(defaults.disk_gib)),
        flag("--arch", architecture_name(architecture)),
    ];
    let speed = [
        rosetta_applies(architecture, vm_type, host).then(|| flag("--vz-rosetta", true)),
        Some(flag("--port-forwarder", PORT_FORWARDER)),
        Some(flag(
            "--mount-inotify",
            changes.mount_inotify.unwrap_or(defaults.mount_inotify),
        )),
    ];

    resources
        .into_iter()
        .chain(vm_type_flags(vm_type))
        .chain(speed.into_iter().flatten())
        .collect()
}

fn existing_profile_flags(
    current: &ColimaVmSettings,
    changes: &ColimaVmSettingsChanges,
    host: &ColimaHost,
) -> Vec<String> {
    let disk_growth = changes.disk_gib.filter(|disk| *disk > current.disk_gib);

    [
        changes.cpus.map(|cpus| flag("--cpus", cpus)),
        changes.memory_gib.map(|memory| flag("--memory", memory)),
        disk_growth.map(|disk| flag("--disk", disk)),
        rosetta_applies(current.architecture, current.vm_type, host)
            .then(|| flag("--vz-rosetta", true)),
        Some(flag("--port-forwarder", PORT_FORWARDER)),
        changes
            .mount_inotify
            .map(|enabled| flag("--mount-inotify", enabled)),
    ]
    .into_iter()
    .flatten()
    .collect()
}

fn flag(name: &str, value: impl Display) -> String {
    format!("{name}={value}")
}

fn architecture_name(architecture: ColimaArchitecture) -> &'static str {
    match architecture {
        ColimaArchitecture::Aarch64 => "aarch64",
        ColimaArchitecture::X86_64 => "x86_64",
    }
}

fn vm_type_flags(vm_type: ColimaVmType) -> Vec<String> {
    let vm_and_mount_type = match vm_type {
        ColimaVmType::Vz => Some(("vz", "virtiofs")),
        ColimaVmType::Krunkit => Some(("krunkit", "virtiofs")),
        ColimaVmType::Qemu => Some(("qemu", "sshfs")),
        ColimaVmType::Other => None,
    };

    vm_and_mount_type
        .map(|(vm, mount)| vec![flag("--vm-type", vm), flag("--mount-type", mount)])
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    const APPLE_SILICON: ColimaHost = ColimaHost {
        cpus: 12,
        memory_gib: 36.0,
        architecture: ColimaArchitecture::Aarch64,
        supports_vz: true,
    };

    const INTEL_ON_MACOS_14: ColimaHost = ColimaHost {
        cpus: 8,
        memory_gib: 16.0,
        architecture: ColimaArchitecture::X86_64,
        supports_vz: true,
    };

    const INTEL_ON_MACOS_12: ColimaHost = ColimaHost {
        cpus: 4,
        memory_gib: 8.0,
        architecture: ColimaArchitecture::X86_64,
        supports_vz: false,
    };

    const TUNED_PROFILE: ColimaVmSettings = ColimaVmSettings {
        cpus: 8,
        memory_gib: 8.0,
        disk_gib: 100,
        architecture: ColimaArchitecture::Aarch64,
        vm_type: ColimaVmType::Vz,
        rosetta: true,
        mount_inotify: false,
    };

    fn no_changes() -> ColimaVmSettingsChanges {
        ColimaVmSettingsChanges::default()
    }

    fn args(
        existing: Option<&ColimaVmSettings>,
        changes: &ColimaVmSettingsChanges,
        host: &ColimaHost,
    ) -> Vec<String> {
        colima_start_args("default", existing, changes, host)
    }

    #[test]
    fn a_fresh_profile_on_apple_silicon_starts_with_all_cores_8_gib_rosetta_vz_virtiofs_and_ssh() {
        assert_eq!(
            args(None, &no_changes(), &APPLE_SILICON),
            [
                "start",
                "--profile=default",
                "--cpus=12",
                "--memory=8",
                "--disk=100",
                "--arch=aarch64",
                "--vm-type=vz",
                "--mount-type=virtiofs",
                "--vz-rosetta=true",
                "--port-forwarder=ssh",
                "--mount-inotify=false",
            ]
        );
    }

    #[test]
    fn a_fresh_profile_on_an_intel_mac_gets_vz_and_virtiofs_but_not_rosetta() {
        assert_eq!(
            args(None, &no_changes(), &INTEL_ON_MACOS_14),
            [
                "start",
                "--profile=default",
                "--cpus=8",
                "--memory=8",
                "--disk=100",
                "--arch=x86_64",
                "--vm-type=vz",
                "--mount-type=virtiofs",
                "--port-forwarder=ssh",
                "--mount-inotify=false",
            ]
        );
    }

    #[test]
    fn a_fresh_profile_before_macos_13_falls_back_to_qemu_and_sshfs() {
        assert_eq!(
            args(None, &no_changes(), &INTEL_ON_MACOS_12),
            [
                "start",
                "--profile=default",
                "--cpus=4",
                "--memory=4",
                "--disk=100",
                "--arch=x86_64",
                "--vm-type=qemu",
                "--mount-type=sshfs",
                "--port-forwarder=ssh",
                "--mount-inotify=false",
            ]
        );
    }

    #[test]
    fn a_fresh_profile_uses_the_values_the_user_changed() {
        let changes = ColimaVmSettingsChanges {
            cpus: Some(4),
            memory_gib: Some(6.0),
            disk_gib: Some(200),
            architecture: None,
            mount_inotify: Some(true),
        };

        let args = args(None, &changes, &APPLE_SILICON);

        assert!(args.contains(&"--cpus=4".to_string()), "{args:?}");
        assert!(args.contains(&"--memory=6".to_string()), "{args:?}");
        assert!(args.contains(&"--disk=200".to_string()), "{args:?}");
        assert!(
            args.contains(&"--mount-inotify=true".to_string()),
            "{args:?}"
        );
    }

    #[test]
    fn a_fresh_x86_64_profile_on_apple_silicon_runs_on_qemu_without_rosetta() {
        let changes = ColimaVmSettingsChanges {
            architecture: Some(ColimaArchitecture::X86_64),
            ..no_changes()
        };

        let args = args(None, &changes, &APPLE_SILICON);

        assert!(args.contains(&"--arch=x86_64".to_string()), "{args:?}");
        assert!(args.contains(&"--vm-type=qemu".to_string()), "{args:?}");
        assert!(args.contains(&"--mount-type=sshfs".to_string()), "{args:?}");
        assert!(!args.contains(&"--vz-rosetta=true".to_string()), "{args:?}");
    }

    #[test]
    fn restarting_an_existing_profile_passes_no_resources_so_colima_keeps_the_tuned_ones() {
        assert_eq!(
            args(Some(&TUNED_PROFILE), &no_changes(), &APPLE_SILICON),
            [
                "start",
                "--profile=default",
                "--vz-rosetta=true",
                "--port-forwarder=ssh",
            ]
        );
    }

    #[test]
    fn an_existing_profile_gets_the_resources_the_user_changed_even_when_lower() {
        let changes = ColimaVmSettingsChanges {
            cpus: Some(4),
            memory_gib: Some(2.5),
            ..no_changes()
        };

        let args = args(Some(&TUNED_PROFILE), &changes, &APPLE_SILICON);

        assert!(args.contains(&"--cpus=4".to_string()), "{args:?}");
        assert!(args.contains(&"--memory=2.5".to_string()), "{args:?}");
    }

    #[test]
    fn an_existing_disk_only_grows_because_lima_cannot_shrink_disks() {
        let shrink = ColimaVmSettingsChanges {
            disk_gib: Some(60),
            ..no_changes()
        };
        let grow = ColimaVmSettingsChanges {
            disk_gib: Some(150),
            ..no_changes()
        };

        assert!(!args(Some(&TUNED_PROFILE), &shrink, &APPLE_SILICON)
            .iter()
            .any(|arg| arg.starts_with("--disk")));
        assert!(
            args(Some(&TUNED_PROFILE), &grow, &APPLE_SILICON).contains(&"--disk=150".to_string())
        );
    }

    #[test]
    fn an_existing_profile_keeps_its_architecture_because_colima_fixes_it_at_creation() {
        let changes = ColimaVmSettingsChanges {
            architecture: Some(ColimaArchitecture::X86_64),
            ..no_changes()
        };

        let args = args(Some(&TUNED_PROFILE), &changes, &APPLE_SILICON);

        assert!(
            !args.iter().any(|arg| arg.starts_with("--arch")),
            "{args:?}"
        );
        assert!(
            !args.iter().any(|arg| arg.starts_with("--vm-type")),
            "{args:?}"
        );
    }

    #[test]
    fn an_existing_profile_turns_hot_reload_on_or_off_only_when_the_user_changed_it() {
        let turn_off = ColimaVmSettingsChanges {
            mount_inotify: Some(false),
            ..no_changes()
        };

        assert!(args(Some(&TUNED_PROFILE), &turn_off, &APPLE_SILICON)
            .contains(&"--mount-inotify=false".to_string()));
        assert!(!args(Some(&TUNED_PROFILE), &no_changes(), &APPLE_SILICON)
            .iter()
            .any(|arg| arg.starts_with("--mount-inotify")));
    }

    #[test]
    fn an_existing_qemu_profile_does_not_get_rosetta() {
        let qemu_profile = ColimaVmSettings {
            vm_type: ColimaVmType::Qemu,
            ..TUNED_PROFILE
        };

        assert!(!args(Some(&qemu_profile), &no_changes(), &APPLE_SILICON)
            .contains(&"--vz-rosetta=true".to_string()));
    }

    #[test]
    fn an_unusual_profile_name_stays_a_single_argument() {
        let args = colima_start_args(
            "my profile; rm -rf ~ $(id)",
            Some(&TUNED_PROFILE),
            &no_changes(),
            &APPLE_SILICON,
        );

        assert_eq!(args[1], "--profile=my profile; rm -rf ~ $(id)");
    }
}
