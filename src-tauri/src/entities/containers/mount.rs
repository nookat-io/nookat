use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize, Eq, Ord)]
pub enum MountPointType {
    #[serde(rename = "")]
    EMPTY,
    #[serde(rename = "bind")]
    BIND,
    #[serde(rename = "volume")]
    VOLUME,
    #[serde(rename = "image")]
    IMAGE,
    #[serde(rename = "tmpfs")]
    TMPFS,
    #[serde(rename = "npipe")]
    NPIPE,
    #[serde(rename = "cluster")]
    CLUSTER,
}

impl ::std::fmt::Display for MountPointType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        match *self {
            MountPointType::EMPTY => write!(f, ""),
            MountPointType::BIND => write!(f, "{}", "bind"),
            MountPointType::VOLUME => write!(f, "{}", "volume"),
            MountPointType::IMAGE => write!(f, "{}", "image"),
            MountPointType::TMPFS => write!(f, "{}", "tmpfs"),
            MountPointType::NPIPE => write!(f, "{}", "npipe"),
            MountPointType::CLUSTER => write!(f, "{}", "cluster"),
        }
    }
}

impl ::std::str::FromStr for MountPointType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "" => Ok(MountPointType::EMPTY),
            "bind" => Ok(MountPointType::BIND),
            "volume" => Ok(MountPointType::VOLUME),
            "image" => Ok(MountPointType::IMAGE),
            "tmpfs" => Ok(MountPointType::TMPFS),
            "npipe" => Ok(MountPointType::NPIPE),
            "cluster" => Ok(MountPointType::CLUSTER),
            x => Err(format!("Invalid enum type: {}", x)),
        }
    }
}

impl ::std::convert::AsRef<str> for MountPointType {
    fn as_ref(&self) -> &str {
        match self {
            MountPointType::EMPTY => "",
            MountPointType::BIND => "bind",
            MountPointType::VOLUME => "volume",
            MountPointType::IMAGE => "image",
            MountPointType::TMPFS => "tmpfs",
            MountPointType::NPIPE => "npipe",
            MountPointType::CLUSTER => "cluster",
        }
    }
}

impl From<bollard::models::MountPointTypeEnum> for MountPointType {
    fn from(mount_point_type: bollard::models::MountPointTypeEnum) -> Self {
        match mount_point_type {
            bollard::models::MountPointTypeEnum::EMPTY => MountPointType::EMPTY,
            bollard::models::MountPointTypeEnum::BIND => MountPointType::BIND,
            bollard::models::MountPointTypeEnum::VOLUME => MountPointType::VOLUME,
            // bollard::models::MountPointTypeEnum::IMAGE => MountPointType::IMAGE,
            bollard::models::MountPointTypeEnum::TMPFS => MountPointType::TMPFS,
            bollard::models::MountPointTypeEnum::NPIPE => MountPointType::NPIPE,
            bollard::models::MountPointTypeEnum::CLUSTER => MountPointType::CLUSTER,
        }
    }
}

/// Optional configuration for the `tmpfs` type.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MountTmpfsOptions {
    /// The size for the tmpfs mount in bytes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<i64>,

    /// The permission mode for the tmpfs mount in an integer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<i64>,

    /// The options to be passed to the tmpfs mount. An array of arrays. Flag options should be provided as 1-length arrays. Other types should be provided as as 2-length arrays, where the first item is the key and the second the value.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<Vec<String>>>,
}

/// Optional configuration for the `volume` type.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MountVolumeOptions {
    /// Populate volume with data from the target.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub no_copy: Option<bool>,

    /// User-defined key/value metadata.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub driver_config: Option<MountVolumeOptionsDriverConfig>,

    /// Source path inside the volume. Must be relative without any back traversals.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subpath: Option<String>,
}

/// Map of driver specific options
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MountVolumeOptionsDriverConfig {
    /// Name of the driver to use to create the volume.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// key/value map of driver specific options.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<HashMap<String, String>>,
}

/// MountPoint represents a mount point configuration inside the container.
/// This is used for reporting the mountpoints in use by a container.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MountPoint {
    /// The mount type:  - `bind` a mount of a file or directory from the host i
    /// nto the container.
    /// - `volume` a docker volume with the given `Name`.
    /// - `image` a docker image
    /// - `tmpfs` a `tmpfs`.
    /// - `npipe` a named pipe from the host into the container.
    /// - `cluster` a Swarm cluster volume
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mount_type: Option<MountPointType>,

    /// Name is the name reference to the underlying data defined by `Source`
    /// e.g., the volume name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Source location of the mount.  For volumes, this contains the storage
    /// location of the volume (within `/var/lib/docker/volumes/`).
    /// For bind-mounts, and `npipe`, this contains the source (host) part of the bind-mount.
    /// For `tmpfs` mount points, this field is empty.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    /// Destination is the path relative to the container root (`/`) where the
    /// `Source` is mounted inside the container.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub destination: Option<String>,

    /// Driver is the volume driver used to create the volume (if it is a volume).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub driver: Option<String>,

    /// Mode is a comma separated list of options supplied by the user when
    /// creating the bind/volume mount.  The default is platform-specific
    /// (`\"z\"` on Linux, empty on Windows).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// Whether the mount is mounted writable (read-write).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rw: Option<bool>,

    /// Propagation describes how mounts are propagated from the host into the
    /// mount point, and vice-versa. Refer to the
    /// [Linux kernel documentation](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt)
    /// for details. This field is not used on Windows.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub propagation: Option<String>,
}

impl From<bollard::models::MountPoint> for MountPoint {
    fn from(mount_point: bollard::models::MountPoint) -> Self {
        MountPoint {
            mount_type: mount_point.typ.map(|typ| typ.into()),
            name: mount_point.name,
            source: mount_point.source,
            destination: mount_point.destination,
            driver: mount_point.driver,
            mode: mount_point.mode,
            rw: mount_point.rw,
            propagation: mount_point.propagation,
        }
    }
}
