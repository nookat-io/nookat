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

impl From<bollard::models::PortSummaryTypeEnum> for PortTypeEnum {
    fn from(port_type: bollard::models::PortSummaryTypeEnum) -> Self {
        match port_type {
            bollard::models::PortSummaryTypeEnum::TCP => PortTypeEnum::Tcp,
            bollard::models::PortSummaryTypeEnum::UDP => PortTypeEnum::Udp,
            bollard::models::PortSummaryTypeEnum::SCTP => PortTypeEnum::Sctp,
            bollard::models::PortSummaryTypeEnum::EMPTY => PortTypeEnum::Empty,
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

impl From<bollard::models::PortSummary> for Port {
    fn from(port: bollard::models::PortSummary) -> Self {
        Port {
            ip: port.ip,
            private_port: port.private_port,
            public_port: port.public_port,
            port_type: port.typ.map(|t| t.into()),
        }
    }
}
