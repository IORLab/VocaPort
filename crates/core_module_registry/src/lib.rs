use core_permission::Permission;
use core_signature::SignatureEnvelope;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PlatformTarget {
    Web,
    Desktop,
    Android,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ModuleManifest {
    pub module_id: String,
    pub version: String,
    pub api_version: String,
    pub capabilities: Vec<String>,
    pub permissions: Vec<Permission>,
    pub platform_targets: Vec<PlatformTarget>,
    pub entrypoint: String,
    pub checksum: String,
    pub signature: SignatureEnvelope,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RegistryError {
    #[error("duplicate module id: {0}")]
    DuplicateModuleId(String),
}

#[derive(Debug, Default)]
pub struct ModuleRegistry {
    manifests: BTreeMap<String, ModuleManifest>,
}

impl ModuleRegistry {
    pub fn register_builtin(&mut self, manifest: ModuleManifest) -> Result<(), RegistryError> {
        if self.manifests.contains_key(&manifest.module_id) {
            return Err(RegistryError::DuplicateModuleId(manifest.module_id));
        }

        self.manifests.insert(manifest.module_id.clone(), manifest);
        Ok(())
    }

    pub fn list_capabilities(&self) -> Vec<String> {
        self.manifests
            .values()
            .flat_map(|manifest| manifest.capabilities.iter().cloned())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect()
    }
}
