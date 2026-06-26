use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SignatureEnvelope {
    pub algorithm: String,
    pub key_id: String,
    pub signature: String,
}

impl SignatureEnvelope {
    pub fn unsigned() -> Self {
        Self {
            algorithm: "none".to_string(),
            key_id: "builtin".to_string(),
            signature: "unsigned".to_string(),
        }
    }
}
