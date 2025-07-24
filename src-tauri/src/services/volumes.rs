#[derive(Default, Debug)]
pub struct VolumesService {}

use crate::entities::Volume;
use bollard::volume::ListVolumesOptions;

use bollard::Docker;

impl VolumesService {
    pub async fn get_volumes() -> Vec<Volume> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options: ListVolumesOptions<String> = ListVolumesOptions::default();

        todo!()
        // return docker
        //     .list_volumes(Some(options))
        //     .await
        //     .expect("Failed to list volumes")
        //     .volumes
        //     .unwrap_or_default();
    }
}
