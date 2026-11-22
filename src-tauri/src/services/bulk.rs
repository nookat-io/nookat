use crate::entities::{BulkFailure, BulkOutcome};
use futures_util::future::join_all;
use std::future::Future;

pub async fn run_for_each_concurrently<'a, Run, Ran>(ids: &'a [String], run: Run) -> BulkOutcome
where
    Run: Fn(&'a str) -> Ran,
    Ran: Future<Output = Result<(), String>>,
{
    let results = join_all(ids.iter().map(|id| run(id))).await;

    let mut outcome = BulkOutcome::default();
    for (id, result) in ids.iter().zip(results) {
        match result {
            Ok(()) => outcome.succeeded.push(id.clone()),
            Err(error) => outcome.failed.push(BulkFailure {
                id: id.clone(),
                error,
            }),
        }
    }
    outcome
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::time::Duration;
    use tokio::sync::Barrier;

    fn ids(names: &[&str]) -> Vec<String> {
        names.iter().map(|name| name.to_string()).collect()
    }

    #[tokio::test]
    async fn keeps_going_after_a_failure_and_reports_each_item() {
        let ids = ids(&["a", "b", "c"]);

        let outcome = run_for_each_concurrently(&ids, |id| async move {
            if id == "b" {
                Err("boom".to_string())
            } else {
                Ok(())
            }
        })
        .await;

        assert_eq!(outcome.succeeded, ["a", "c"]);
        assert_eq!(
            outcome.failed,
            [BulkFailure {
                id: "b".to_string(),
                error: "boom".to_string(),
            }]
        );
    }

    #[tokio::test]
    async fn keeps_the_input_order_when_items_finish_out_of_order() {
        let ids = ids(&["slow", "fast"]);

        let outcome = run_for_each_concurrently(&ids, |id| async move {
            if id == "slow" {
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
            Ok(())
        })
        .await;

        assert_eq!(outcome.succeeded, ["slow", "fast"]);
        assert!(outcome.failed.is_empty());
    }

    #[tokio::test]
    async fn runs_the_items_concurrently() {
        let ids = ids(&["a", "b", "c"]);
        let barrier = Arc::new(Barrier::new(ids.len()));

        let outcome = tokio::time::timeout(
            Duration::from_secs(5),
            run_for_each_concurrently(&ids, |_| {
                let barrier = barrier.clone();
                async move {
                    barrier.wait().await;
                    Ok(())
                }
            }),
        )
        .await
        .expect("the items ran one after another");

        assert_eq!(outcome.succeeded, ["a", "b", "c"]);
    }
}
