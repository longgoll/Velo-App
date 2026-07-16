pub mod pb {
    pub mod auth {
        tonic::include_proto!("auth");
    }
    pub mod gateway {
        tonic::include_proto!("gateway");
    }
}

use pb::auth::auth_service_client::AuthServiceClient;
use pb::auth::VerifyTokenRequest;
use pb::gateway::gateway_service_client::GatewayServiceClient;
use pb::gateway::CheckChannelAccessRequest;
use tonic::transport::Channel;

#[derive(Clone)]
pub struct GrpcClients {
    auth_client: AuthServiceClient<Channel>,
    gateway_client: GatewayServiceClient<Channel>,
}

impl GrpcClients {
    pub async fn new(grpc_url: &str) -> Result<Self, tonic::transport::Error> {
        let channel = Channel::from_shared(grpc_url.to_string())?
            .connect()
            .await?;

        Ok(Self {
            auth_client: AuthServiceClient::new(channel.clone()),
            gateway_client: GatewayServiceClient::new(channel),
        })
    }

    pub async fn verify_token(&self, token: &str) -> Result<pb::auth::VerifyTokenResponse, tonic::Status> {
        let mut client = self.auth_client.clone();
        let request = tonic::Request::new(VerifyTokenRequest {
            token: token.to_string(),
        });

        let response = client.verify_token(request).await?;
        Ok(response.into_inner())
    }

    pub async fn check_channel_access(&self, user_id: &str, channel_id: &str) -> Result<pb::gateway::CheckChannelAccessResponse, tonic::Status> {
        let mut client = self.gateway_client.clone();
        let request = tonic::Request::new(CheckChannelAccessRequest {
            user_id: user_id.to_string(),
            channel_id: channel_id.to_string(),
        });

        let response = client.check_channel_access(request).await?;
        Ok(response.into_inner())
    }
}
