import { Activity, Cpu, HardDrive, MemoryStick, Monitor, Image } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

interface SystemInfo {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}


// System info component
export const SystemTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  async function getSystemInfo() {
    try {
      // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
      const result = await invoke<SystemInfo>("get_system_info");
      setSystemInfo(result);
      console.log("System info received:", result);

      // Get the cpu usage
      const cpuUsage = result.cpu_usage;
      console.log("CPU usage:", cpuUsage);

      // Get the memory usage
      const memoryUsage = result.memory_usage;
      console.log("Memory usage:", memoryUsage);
    } catch (error) {
      console.error("Error getting system info:", error);
      console.log(systemInfo);
    }
  }

  useEffect(() => {
    getSystemInfo();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">System</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="text-blue-400" size={24} />
            <h3 className="font-semibold text-white">System Info</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">Docker Version: <span className="text-white">24.0.7</span></p>
            <p className="text-gray-400">API Version: <span className="text-white">1.43</span></p>
            <p className="text-gray-400">Go Version: <span className="text-white">go1.20.10</span></p>
            <p className="text-gray-400">OS/Arch: <span className="text-white">linux/amd64</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="text-green-400" size={24} />
            <h3 className="font-semibold text-white">CPU Usage</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current</span>
              <span className="text-white">23.5%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-400 h-2 rounded-full" style={{ width: '23.5%' }}></div>
            </div>
            <p className="text-xs text-gray-400">8 cores available</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <MemoryStick className="text-purple-400" size={24} />
            <h3 className="font-semibold text-white">Memory</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Used</span>
              <span className="text-white">4.2GB / 16GB</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full" style={{ width: '26.25%' }}></div>
            </div>
            <p className="text-xs text-gray-400">26.25% used</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-yellow-400" size={24} />
            <h3 className="font-semibold text-white">Containers</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">Running: <span className="text-green-400">2</span></p>
            <p className="text-gray-400">Stopped: <span className="text-red-400">1</span></p>
            <p className="text-gray-400">Total: <span className="text-white">3</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Image className="text-blue-400" size={24} />
            <h3 className="font-semibold text-white">Images</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">Total: <span className="text-white">3</span></p>
            <p className="text-gray-400">Size: <span className="text-white">548MB</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="text-green-400" size={24} />
            <h3 className="font-semibold text-white">Storage</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">Volumes: <span className="text-white">2</span></p>
            <p className="text-gray-400">Size: <span className="text-white">257MB</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
