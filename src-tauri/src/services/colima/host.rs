use super::gib_from_bytes;
use crate::entities::{ColimaArchitecture, ColimaHost};
use std::collections::HashMap;

#[cfg(target_os = "macos")]
pub const HOST_SYSCTL_KEYS: [&str; 4] = [
    "hw.ncpu",
    "hw.memsize",
    "hw.optional.arm64",
    "kern.osproductversion",
];

const FIRST_MACOS_WITH_VZ_LINUX_GUESTS: u32 = 13;

pub fn parse_host_sysctl(output: &str) -> Result<ColimaHost, String> {
    let values: HashMap<&str, &str> = output
        .lines()
        .filter_map(|line| line.split_once(':'))
        .map(|(key, value)| (key.trim(), value.trim()))
        .collect();

    let cpus = values
        .get("hw.ncpu")
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or("sysctl did not report the number of CPUs (hw.ncpu)")?;
    let memory_bytes = values
        .get("hw.memsize")
        .and_then(|value| value.parse::<u64>().ok())
        .ok_or("sysctl did not report the memory size (hw.memsize)")?;
    let architecture = match values.get("hw.optional.arm64") {
        Some(&"1") => ColimaArchitecture::Aarch64,
        _ => ColimaArchitecture::X86_64,
    };
    let macos_major_version = values
        .get("kern.osproductversion")
        .and_then(|version| version.split('.').next())
        .and_then(|major| major.parse::<u32>().ok());

    Ok(ColimaHost {
        cpus,
        memory_gib: gib_from_bytes(memory_bytes),
        architecture,
        supports_vz: macos_major_version
            .is_some_and(|major| major >= FIRST_MACOS_WITH_VZ_LINUX_GUESTS),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const APPLE_SILICON_SYSCTL: &str = "hw.ncpu: 12\n\
        hw.memsize: 38654705664\n\
        hw.optional.arm64: 1\n\
        kern.osproductversion: 26.6.2\n";

    #[test]
    fn reads_cores_memory_and_architecture_of_an_apple_silicon_mac() {
        let host = parse_host_sysctl(APPLE_SILICON_SYSCTL).expect("valid sysctl output");

        assert_eq!(
            host,
            ColimaHost {
                cpus: 12,
                memory_gib: 36.0,
                architecture: ColimaArchitecture::Aarch64,
                supports_vz: true,
            }
        );
    }

    #[test]
    fn treats_a_mac_without_the_arm64_key_as_intel() {
        let host =
            parse_host_sysctl("hw.ncpu: 8\nhw.memsize: 17179869184\nkern.osproductversion: 14.7\n")
                .expect("valid sysctl output");

        assert_eq!(host.architecture, ColimaArchitecture::X86_64);
        assert!(host.supports_vz);
    }

    #[test]
    fn treats_an_intel_mac_that_reports_arm64_as_zero_as_intel() {
        let host = parse_host_sysctl(
            "hw.ncpu: 8\nhw.memsize: 17179869184\nhw.optional.arm64: 0\nkern.osproductversion: 13.0\n",
        )
        .expect("valid sysctl output");

        assert_eq!(host.architecture, ColimaArchitecture::X86_64);
    }

    #[test]
    fn macos_12_cannot_run_linux_guests_on_the_virtualization_framework() {
        let host = parse_host_sysctl(
            "hw.ncpu: 8\nhw.memsize: 17179869184\nkern.osproductversion: 12.7.6\n",
        )
        .expect("valid sysctl output");

        assert!(!host.supports_vz);
    }

    #[test]
    fn fails_when_the_cpu_count_is_missing_instead_of_guessing() {
        let error = parse_host_sysctl("hw.memsize: 17179869184\n").expect_err("must fail");

        assert!(error.contains("hw.ncpu"), "{error}");
    }
}
