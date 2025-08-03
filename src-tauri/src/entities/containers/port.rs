use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize, Eq, Ord)]
pub enum PortTypeEnum {
    #[serde(rename = "")]
    Empty,

    #[serde(rename = "tcp")]
    Tcp,

    #[serde(rename = "udp")]
    Udp,

    #[serde(rename = "sctp")]
    Sctp,
}

impl From<bollard::models::PortTypeEnum> for PortTypeEnum {
    fn from(port_type: bollard::models::PortTypeEnum) -> Self {
        match port_type {
            bollard::models::PortTypeEnum::TCP => PortTypeEnum::Tcp,
            bollard::models::PortTypeEnum::UDP => PortTypeEnum::Udp,
            bollard::models::PortTypeEnum::SCTP => PortTypeEnum::Sctp,
            bollard::models::PortTypeEnum::EMPTY => PortTypeEnum::Empty,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Port {
    /// Host IP address that the container's port is mapped to
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,

    /// Port on the container
    pub private_port: u16,

    /// Port exposed on the host
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_port: Option<u16>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub port_type: Option<PortTypeEnum>,
}

impl From<bollard::models::Port> for Port {
    fn from(port: bollard::models::Port) -> Self {
        Port {
            ip: port.ip,
            private_port: port.private_port,
            public_port: port.public_port,
            port_type: port.typ.map(|t| t.into()),
        }
    }
}
