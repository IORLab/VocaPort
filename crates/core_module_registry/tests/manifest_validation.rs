use core_module_registry::{ModuleManifest, ModuleRegistry, PlatformTarget};
use core_permission::Permission;
use core_signature::SignatureEnvelope;

#[test]
fn registry_rejects_duplicate_module_ids() {
    let manifest = ModuleManifest {
        module_id: "quiz_mcq".to_string(),
        version: "0.1.0".to_string(),
        api_version: "1".to_string(),
        capabilities: vec!["quiz.generate".to_string()],
        permissions: vec![Permission::QuizGenerate],
        platform_targets: vec![PlatformTarget::Web, PlatformTarget::Desktop],
        entrypoint: "builtin:quiz_mcq".to_string(),
        checksum: "sha256:demo".to_string(),
        signature: SignatureEnvelope::unsigned(),
    };

    let manifest_json = serde_json::to_string(&manifest).unwrap();
    assert!(manifest_json.contains("\"moduleId\":\"quiz_mcq\""));
    assert!(manifest_json.contains("\"permissions\":[\"quiz.generate\"]"));
    assert!(manifest_json.contains("\"platformTargets\":[\"web\",\"desktop\"]"));

    let mut registry = ModuleRegistry::default();
    registry.register_builtin(manifest.clone()).unwrap();
    assert_eq!(
        registry.list_capabilities(),
        vec!["quiz.generate".to_string()]
    );

    let duplicate_error = registry.register_builtin(manifest).unwrap_err();
    assert!(duplicate_error.to_string().contains("duplicate"));
}
