use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct BulkOutcome {
    pub succeeded: Vec<String>,
    pub failed: Vec<BulkFailure>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BulkFailure {
    pub id: String,
    pub error: String,
}
