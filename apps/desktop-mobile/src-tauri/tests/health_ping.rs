use vocaport_native_shell::health_ping;

#[test]
fn health_ping_returns_ready() {
    assert_eq!(health_ping(), "vocaport-ready");
}
