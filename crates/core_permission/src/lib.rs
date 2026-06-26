use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Permission {
    #[serde(rename = "import.apkg.read")]
    ImportApkgRead,
    #[serde(rename = "media.asset.read")]
    MediaAssetRead,
    #[serde(rename = "quiz.generate")]
    QuizGenerate,
    #[serde(rename = "scheduler.compute")]
    SchedulerCompute,
    #[serde(rename = "storage.module_scoped")]
    StorageModuleScoped,
    #[serde(rename = "network.none")]
    NetworkNone,
    #[serde(rename = "network.limited")]
    NetworkLimited,
    #[serde(rename = "ui.route.register")]
    UiRouteRegister,
}
