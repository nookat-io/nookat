use bollard::models::Network;
use bollard::network::ListNetworksOptions;

use bollard::Docker;

#[derive(Default, Debug)]
pub struct NetworksService {}

impl NetworksService {
    pub async fn get_networks() -> Vec<Network> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options: ListNetworksOptions<String> = ListNetworksOptions::default();

        let networks: Vec<bollard::models::Network> =
            docker.list_networks(Some(options)).await.unwrap();
        return networks;
    }
}
