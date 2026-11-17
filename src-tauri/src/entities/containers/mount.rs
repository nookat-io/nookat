use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize, Eq, Ord)]
pub enum MountPointType {
    #[serde(rename = "")]
    Empty,
    #[serde(rename = "bind")]
    Bind,
    #[serde(rename = "volume")]
    Volume,
    #[serde(rename = "image")]
    Image,
    #[serde(rename = "tmpfs")]
    Tmpfs,
    #[serde(rename = "npipe")]
    Npipe,
    #[serde(rename = "cluster")]
    Cluster,
}

impl ::std::fmt::Display for MountPointType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        match *self {
            MountPointType::Empty => write!(f, ""),
            MountPointType::Bind => write!(f, "bind"),
            MountPointType::Volume => write!(f, "volume"),
            MountPointType::Image => write!(f, "image"),
            MountPointType::Tmpfs => write!(f, "tmpfs"),
            MountPointType::Npipe => write!(f, "npipe"),
            MountPointType::Cluster => write!(f, "cluster"),
        }
    }
}

impl ::std::str::FromStr for MountPointType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "" => Ok(MountPointType::Empty),
            "bind" => Ok(MountPointType::Bind),
            "volume" => Ok(MountPointType::Volume),
            "image" => Ok(MountPointType::Image),
            "tmpfs" => Ok(MountPointType::Tmpfs),
            "npipe" => Ok(MountPointType::Npipe),
            "cluster" => Ok(MountPointType::Cluster),
            x => Err(format!("Invalid enum type: {}", x)),
        }
    }
}

impl ::std::convert::AsRef<str> for MountPointType {
    fn as_ref(&self) -> &str {
        match self {
            MountPointType::Empty => "",
            MountPointType::Bind => "bind",
            MountPointType::Volume => "volume",
            MountPointType::Image => "image",
            MountPointType::Tmpfs => "tmpfs",
            MountPointType::Npipe => "npipe",
            MountPointType::Cluster => "cluster",
        }
    }
}

impl From<bollard::models::MountPointType> for MountPointType {
    fn from(mount_point_type: bollard::models::MountPointType) -> Self {
        mount_point_type.parse().unwrap_or(MountPointType::Empty)
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MountPoint {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mount_type: Option<MountPointType>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub destination: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub driver: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub rw: Option<bool>,

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

#[cfg(test)]
mod tests {
    use super::MountPointType;

    #[test]
    fn a_known_mount_type_keeps_its_kind() {
        assert_eq!(
            MountPointType::from("volume".to_string()),
            MountPointType::Volume
        );
    }

    #[test]
    fn a_mount_type_this_build_does_not_know_reads_as_empty_instead_of_failing_the_listing() {
        assert_eq!(
            MountPointType::from("some-future-type".to_string()),
            MountPointType::Empty
        );
    }
}
