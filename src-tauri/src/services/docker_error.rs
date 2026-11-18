use bollard::errors::Error as DockerError;

pub(super) fn docker_message(error: &DockerError) -> String {
    match error {
        DockerError::DockerResponseServerError { message, .. } => message.clone(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shows_what_the_engine_answered_without_the_status_code() {
        let error = DockerError::DockerResponseServerError {
            status_code: 409,
            message: "network with name backend already exists".to_string(),
        };

        assert_eq!(
            docker_message(&error),
            "network with name backend already exists"
        );
    }

    #[test]
    fn describes_an_error_the_engine_did_not_answer_with_its_own_text() {
        let error = DockerError::RequestTimeoutError;

        assert_eq!(docker_message(&error), error.to_string());
    }
}
