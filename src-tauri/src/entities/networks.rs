use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Network {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub ipam: Ipam,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Ipam {
    pub driver: String,
    // pub config: Vec<IpamConfig>,
}
