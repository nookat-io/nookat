use bollard::image::ListImagesOptions;
use bollard::Docker;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Image {
    pub id: String,
    pub repository: Option<String>,
    pub tag: Option<String>,
    pub image_id: String,
    pub created: i64,
    pub size: i64,
    pub in_use: bool,
}

async fn get_images() -> Vec<Image> {
    let docker = Docker::connect_with_local_defaults().unwrap();

    let options: ListImagesOptions<String> = ListImagesOptions::default();

    let images = &docker
        .list_images(Some(options))
        .await
        .expect("Failed to list images");

    images
        .iter()
        .map(|image| {
            let mut image_name = None;
            let mut image_tag = None;

            if image.repo_tags.len() > 0 {
                let tag_full = image.repo_tags[0].clone();
                let parts: Vec<&str> = tag_full.splitn(2, ':').collect();

                if parts.len() == 2 {
                    image_name = Some(parts[0].to_string());
                    image_tag = Some(parts[1].to_string());
                } else if parts.len() == 1 {
                    // Handle case where there's no tag (just repository name)
                    image_name = Some(parts[0].to_string());
                    image_tag = Some("unknown".to_string());
                }
            } else {
                let id = image.id.clone();
                if id.starts_with("sha256:") {
                    image_name = Some(id.split(":").nth(1).unwrap_or("unknown").to_string());
                    image_tag = Some("unknown".to_string());
                } else {
                    image_name = Some(id);
                    image_tag = Some("unknown".to_string());
                }
            }

            Image {
                id: image.id.clone(),
                repository: image_name,
                tag: image_tag,
                image_id: image.id.clone(),
                created: image.created,
                size: image.size,
                in_use: false,
            }
        })
        .collect()
}

#[tauri::command]
pub async fn list_images() -> Vec<Image> {
    println!("Listing images");

    let images = get_images().await;
    return images;
}
