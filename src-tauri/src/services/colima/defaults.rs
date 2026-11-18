use crate::entities::{ColimaArchitecture, ColimaHost, ColimaVmSettings, ColimaVmType};

const DEFAULT_MEMORY_GIB: f64 = 8.0;
const MINIMUM_MEMORY_GIB: f64 = 2.0;
const DEFAULT_DISK_GIB: u32 = 100;

pub fn default_settings(host: &ColimaHost) -> ColimaVmSettings {
    let vm_type = vm_type_for(host.architecture, host);
    ColimaVmSettings {
        cpus: host.cpus,
        memory_gib: default_memory_gib(host.memory_gib),
        disk_gib: DEFAULT_DISK_GIB,
        architecture: host.architecture,
        vm_type,
        rosetta: rosetta_applies(host.architecture, vm_type, host),
        mount_inotify: false,
    }
}

pub fn vm_type_for(architecture: ColimaArchitecture, host: &ColimaHost) -> ColimaVmType {
    if architecture == host.architecture && host.supports_vz {
        ColimaVmType::Vz
    } else {
        ColimaVmType::Qemu
    }
}

pub fn rosetta_applies(
    architecture: ColimaArchitecture,
    vm_type: ColimaVmType,
    host: &ColimaHost,
) -> bool {
    host.architecture == ColimaArchitecture::Aarch64
        && architecture == ColimaArchitecture::Aarch64
        && vm_type == ColimaVmType::Vz
}

fn default_memory_gib(host_memory_gib: f64) -> f64 {
    let half_of_host_memory = (host_memory_gib / 2.0).floor();
    half_of_host_memory.clamp(MINIMUM_MEMORY_GIB, DEFAULT_MEMORY_GIB)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn host(architecture: ColimaArchitecture, memory_gib: f64, supports_vz: bool) -> ColimaHost {
        ColimaHost {
            cpus: 12,
            memory_gib,
            architecture,
            supports_vz,
        }
    }

    #[test]
    fn a_fresh_profile_on_apple_silicon_gets_all_cores_8_gib_100_gib_vz_and_rosetta() {
        let settings = default_settings(&host(ColimaArchitecture::Aarch64, 36.0, true));

        assert_eq!(
            settings,
            ColimaVmSettings {
                cpus: 12,
                memory_gib: 8.0,
                disk_gib: 100,
                architecture: ColimaArchitecture::Aarch64,
                vm_type: ColimaVmType::Vz,
                rosetta: true,
                mount_inotify: false,
            }
        );
    }

    #[test]
    fn an_intel_mac_gets_vz_without_rosetta() {
        let settings = default_settings(&host(ColimaArchitecture::X86_64, 32.0, true));

        assert_eq!(settings.vm_type, ColimaVmType::Vz);
        assert!(!settings.rosetta);
    }

    #[test]
    fn a_mac_without_vz_support_gets_qemu() {
        let settings = default_settings(&host(ColimaArchitecture::X86_64, 32.0, false));

        assert_eq!(settings.vm_type, ColimaVmType::Qemu);
    }

    #[test]
    fn memory_stays_at_half_of_a_small_host_because_vz_never_returns_guest_memory() {
        assert_eq!(
            default_settings(&host(ColimaArchitecture::Aarch64, 8.0, true)).memory_gib,
            4.0
        );
        assert_eq!(
            default_settings(&host(ColimaArchitecture::Aarch64, 16.0, true)).memory_gib,
            8.0
        );
        assert_eq!(
            default_settings(&host(ColimaArchitecture::Aarch64, 3.0, true)).memory_gib,
            2.0
        );
    }

    #[test]
    fn a_foreign_architecture_needs_qemu_and_cannot_use_rosetta() {
        let apple_silicon = host(ColimaArchitecture::Aarch64, 36.0, true);

        let vm_type = vm_type_for(ColimaArchitecture::X86_64, &apple_silicon);

        assert_eq!(vm_type, ColimaVmType::Qemu);
        assert!(!rosetta_applies(
            ColimaArchitecture::X86_64,
            vm_type,
            &apple_silicon
        ));
    }
}
