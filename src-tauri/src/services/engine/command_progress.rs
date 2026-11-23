use crate::entities::InstallationProgress;

pub const KEPT_LOG_LINES: usize = 200;

pub struct CommandProgress {
    progress: InstallationProgress,
}

impl CommandProgress {
    pub fn new(step: &str, message: &str, log: &str) -> Self {
        let mut command_progress = CommandProgress {
            progress: InstallationProgress {
                step: String::new(),
                message: String::new(),
                percentage: None,
                logs: Vec::new(),
            },
        };
        command_progress.begin(step, message, log);
        command_progress
    }

    pub fn current(&self) -> &InstallationProgress {
        &self.progress
    }

    pub fn begin(&mut self, step: &str, message: &str, log: &str) {
        self.progress.step = step.to_string();
        self.progress.message = message.to_string();
        self.progress.percentage = None;
        self.log(format!("[INFO] {log}"));
    }

    pub fn begin_command(&mut self, step: &str, command: &str) {
        self.begin(step, command, &format!("Running: {command}"));
    }

    pub fn begin_homebrew_install(&mut self, package: &str, position: usize, total: usize) {
        self.begin_command(
            &format!("Installing {package} with Homebrew ({position} of {total})..."),
            &format!("brew install {package}"),
        );
    }

    pub fn output_line(&mut self, line: &str) {
        self.progress.message = line.to_string();
        self.log(line.to_string());
    }

    pub fn succeed(&mut self, step: &str, message: &str) {
        self.progress.step = step.to_string();
        self.progress.message = message.to_string();
        self.progress.percentage = Some(100);
        self.log(format!("[INFO] {message}"));
    }

    pub fn fail(&mut self, step: &str, message: &str, error: &str) {
        self.progress.step = step.to_string();
        self.progress.message = message.to_string();
        self.progress.percentage = Some(100);
        self.log(format!("[ERROR] {error}"));
    }

    fn log(&mut self, line: String) {
        let logs = &mut self.progress.logs;
        logs.push(line);
        let overflow = logs.len().saturating_sub(KEPT_LOG_LINES);
        logs.drain(..overflow);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn installing_colima() -> CommandProgress {
        let mut progress = CommandProgress::new(
            "Installing Colima...",
            "Installing Colima with Homebrew",
            "Installing Colima with Homebrew",
        );
        progress.begin_homebrew_install("colima", 1, 2);
        progress
    }

    #[test]
    fn shows_each_output_line_as_the_message_and_logs_it() {
        let mut progress = installing_colima();

        progress.output_line("==> Fetching colima");
        progress.output_line("==> Pouring colima--0.8.1.arm64_sonoma.bottle.tar.gz");

        let current = progress.current();
        assert_eq!(
            current.message,
            "==> Pouring colima--0.8.1.arm64_sonoma.bottle.tar.gz"
        );
        assert_eq!(
            current.logs[current.logs.len() - 2..],
            [
                "==> Fetching colima",
                "==> Pouring colima--0.8.1.arm64_sonoma.bottle.tar.gz"
            ]
        );
    }

    #[test]
    fn logs_the_command_it_runs() {
        let progress = installing_colima();

        assert_eq!(
            progress.current().logs.last().unwrap(),
            "[INFO] Running: brew install colima"
        );
    }

    #[test]
    fn reports_no_percentage_while_a_command_runs_and_100_once_it_ends() {
        let mut succeeding = installing_colima();
        succeeding.output_line("==> Pouring colima");
        assert_eq!(succeeding.current().percentage, None);

        succeeding.succeed("Installation complete", "Colima installed");
        assert_eq!(succeeding.current().percentage, Some(100));
        assert_eq!(
            succeeding.current().logs.last().unwrap(),
            "[INFO] Colima installed"
        );

        let mut failing = installing_colima();
        failing.output_line("Error: Download failed");
        assert_eq!(failing.current().percentage, None);

        failing.fail(
            "Installation failed",
            "Failed to install Colima",
            "Failed to install colima: Error: Download failed",
        );
        assert_eq!(failing.current().percentage, Some(100));
        assert_eq!(
            failing.current().logs.last().unwrap(),
            "[ERROR] Failed to install colima: Error: Download failed"
        );
    }

    #[test]
    fn starts_each_step_without_a_percentage() {
        let mut progress = installing_colima();
        progress.succeed("Colima installed", "Colima installed");

        progress.begin_homebrew_install("docker", 2, 2);

        assert_eq!(progress.current().percentage, None);
    }

    #[test]
    fn names_the_homebrew_package_and_its_position() {
        let mut progress = installing_colima();

        progress.begin_homebrew_install("docker", 2, 2);

        assert_eq!(
            progress.current().step,
            "Installing docker with Homebrew (2 of 2)..."
        );
        assert_eq!(progress.current().message, "brew install docker");
    }

    #[test]
    fn keeps_only_the_newest_lines() {
        let mut progress = CommandProgress::new("Starting VM...", "colima start", "line 1");

        for number in 2..=KEPT_LOG_LINES + 10 {
            progress.output_line(&format!("line {number}"));
        }

        let logs = &progress.current().logs;
        assert_eq!(logs.len(), KEPT_LOG_LINES);
        assert_eq!(logs[0], "line 11");
        assert_eq!(
            logs.last().unwrap(),
            &format!("line {}", KEPT_LOG_LINES + 10)
        );
    }
}
