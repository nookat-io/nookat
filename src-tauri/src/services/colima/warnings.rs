use super::rosetta_applies;
use crate::entities::{ColimaHost, ColimaPerformanceWarning, ColimaProfile, ColimaProfileStatus};

const MOST_CPUS_WORTH_A_WARNING: u32 = 2;

pub fn performance_warnings(
    profile: &ColimaProfile,
    host: &ColimaHost,
) -> Vec<ColimaPerformanceWarning> {
    if profile.status != ColimaProfileStatus::Running {
        return vec![];
    }

    let settings = &profile.settings;
    let has_few_cpus = settings.cpus <= MOST_CPUS_WORTH_A_WARNING;
    let rosetta_is_off =
        rosetta_applies(settings.architecture, settings.vm_type, host) && !settings.rosetta;

    [
        has_few_cpus.then_some(ColimaPerformanceWarning::FewCpus {
            cpus: settings.cpus,
        }),
        rosetta_is_off.then_some(ColimaPerformanceWarning::RosettaOff),
    ]
    .into_iter()
    .flatten()
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::{ColimaArchitecture, ColimaVmSettings, ColimaVmType};

    const APPLE_SILICON: ColimaHost = ColimaHost {
        cpus: 12,
        memory_gib: 36.0,
        architecture: ColimaArchitecture::Aarch64,
        supports_vz: true,
    };

    const INTEL: ColimaHost = ColimaHost {
        cpus: 8,
        memory_gib: 16.0,
        architecture: ColimaArchitecture::X86_64,
        supports_vz: true,
    };

    fn profile(status: ColimaProfileStatus, cpus: u32, rosetta: bool) -> ColimaProfile {
        ColimaProfile {
            name: "default".to_string(),
            status,
            settings: ColimaVmSettings {
                cpus,
                memory_gib: 8.0,
                disk_gib: 100,
                architecture: ColimaArchitecture::Aarch64,
                vm_type: ColimaVmType::Vz,
                rosetta,
                mount_inotify: false,
            },
        }
    }

    #[test]
    fn warns_about_a_running_vm_that_nookat_used_to_start_with_2_cpus_and_no_rosetta() {
        let warnings = performance_warnings(
            &profile(ColimaProfileStatus::Running, 2, false),
            &APPLE_SILICON,
        );

        assert_eq!(
            warnings,
            vec![
                ColimaPerformanceWarning::FewCpus { cpus: 2 },
                ColimaPerformanceWarning::RosettaOff,
            ]
        );
    }

    #[test]
    fn a_well_tuned_vm_has_no_warnings() {
        let warnings = performance_warnings(
            &profile(ColimaProfileStatus::Running, 12, true),
            &APPLE_SILICON,
        );

        assert_eq!(warnings, vec![]);
    }

    #[test]
    fn three_cpus_are_not_worth_a_warning() {
        let warnings = performance_warnings(
            &profile(ColimaProfileStatus::Running, 3, true),
            &APPLE_SILICON,
        );

        assert_eq!(warnings, vec![]);
    }

    #[test]
    fn a_stopped_vm_has_no_warnings_because_the_form_shows_what_the_next_start_uses() {
        let warnings = performance_warnings(
            &profile(ColimaProfileStatus::Stopped, 2, false),
            &APPLE_SILICON,
        );

        assert_eq!(warnings, vec![]);
    }

    #[test]
    fn rosetta_is_never_expected_on_an_intel_mac() {
        let mut intel_profile = profile(ColimaProfileStatus::Running, 8, false);
        intel_profile.settings.architecture = ColimaArchitecture::X86_64;

        assert_eq!(performance_warnings(&intel_profile, &INTEL), vec![]);
    }

    #[test]
    fn rosetta_is_not_expected_for_a_qemu_vm() {
        let mut qemu_profile = profile(ColimaProfileStatus::Running, 8, false);
        qemu_profile.settings.vm_type = ColimaVmType::Qemu;

        assert_eq!(performance_warnings(&qemu_profile, &APPLE_SILICON), vec![]);
    }
}
