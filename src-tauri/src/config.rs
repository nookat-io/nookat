use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub docker: DockerConfig,
    pub terminal: TerminalConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerConfig {
    pub stop_timeout: i64,
    pub restart_timeout: i64,
    pub log_lines_limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalConfig {
    pub linux_terminals: Vec<TerminalCommand>,
    pub preferred_shells: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalCommand {
    pub name: String,
    pub executable: String,
    pub args_template: Vec<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            docker: DockerConfig::default(),
            terminal: TerminalConfig::default(),
        }
    }
}

impl Default for DockerConfig {
    fn default() -> Self {
        Self {
            stop_timeout: 10,
            restart_timeout: 10,
            log_lines_limit: 1000,
        }
    }
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            linux_terminals: vec![
                TerminalCommand {
                    name: "GNOME Terminal".to_string(),
                    executable: "gnome-terminal".to_string(),
                    args_template: vec!["--".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "Konsole".to_string(),
                    executable: "konsole".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "XTerm".to_string(),
                    executable: "xterm".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "Alacritty".to_string(),
                    executable: "alacritty".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "Kitty".to_string(),
                    executable: "kitty".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "Tilix".to_string(),
                    executable: "tilix".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
                TerminalCommand {
                    name: "Terminator".to_string(),
                    executable: "terminator".to_string(),
                    args_template: vec!["-e".to_string(), "docker".to_string(), "exec".to_string(), "-it".to_string(), "{container_id}".to_string(), "{shell}".to_string()],
                },
            ],
            preferred_shells: vec!["bash".to_string(), "sh".to_string()],
        }
    }
}

impl TerminalCommand {
    pub fn build_args(&self, container_id: &str, shell: &str) -> Vec<String> {
        self.args_template
            .iter()
            .map(|arg| {
                arg.replace("{container_id}", container_id)
                   .replace("{shell}", shell)
            })
            .collect()
    }
}