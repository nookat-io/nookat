alias k := kill_tauri_runs
alias r := tauri_dev

kill_tauri_runs:
    echo "Killing tauri runs"
    ps aux | grep "npm run tauri" | grep -v grep | awk '{print $2}' | xargs -r kill -9


tauri_dev:
    npm run tauri dev