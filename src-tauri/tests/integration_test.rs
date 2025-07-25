#[cfg(test)]
mod tests {
    use nookat_lib::{AppError, AppResult};
    use nookat_lib::services::DockerService;

    #[tokio::test]
    async fn test_docker_connection_error_handling() {
        // This test verifies that we handle Docker connection errors gracefully
        // Note: This will fail if Docker is not available, which is expected behavior
        let result = DockerService::connect();
        
        match result {
            Ok(_) => {
                // Docker is available - this is fine
                println!("Docker connection successful");
            }
            Err(AppError::OperationFailed(msg)) => {
                // Expected when Docker is not available
                assert!(msg.contains("Docker") || msg.contains("daemon"));
                println!("Expected Docker error: {}", msg);
            }
            Err(AppError::DockerConnection(_)) => {
                // Also expected when Docker connection fails
                println!("Docker connection error handled correctly");
            }
            Err(e) => {
                panic!("Unexpected error type: {:?}", e);
            }
        }
    }

    #[test]
    fn test_error_types() {
        // Test that our error types can be created and formatted correctly
        let container_error = AppError::ContainerNotFound { 
            id: "test123".to_string() 
        };
        assert_eq!(format!("{}", container_error), "Container not found: test123");

        let validation_error = AppError::ValidationError("Invalid input".to_string());
        assert_eq!(format!("{}", validation_error), "Validation error: Invalid input");

        let operation_error = AppError::OperationFailed("Something went wrong".to_string());
        assert_eq!(format!("{}", operation_error), "Operation failed: Something went wrong");
    }

    #[test]
    fn test_app_result_type() {
        // Test that our AppResult type works correctly
        let success: AppResult<String> = Ok("success".to_string());
        assert!(success.is_ok());

        let error: AppResult<String> = Err(AppError::ValidationError("test error".to_string()));
        assert!(error.is_err());
    }
}