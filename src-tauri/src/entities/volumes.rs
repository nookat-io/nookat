use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Volume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
}
