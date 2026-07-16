fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(false) // Gateway only needs gRPC Clients, not Servers
        .compile(
            &["../../proto/auth.proto", "../../proto/gateway.proto"],
            &["../../proto"],
        )?;
    Ok(())
}
