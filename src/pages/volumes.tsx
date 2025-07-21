import { invoke } from "@tauri-apps/api/core";
import { HardDrive, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";


interface VolumeData {
  id: string;
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt: string;
  Scope: string;
  Labels: string[];
}


export const VolumesTab: React.FC = () => {
  const [volumes, setVolumes] = useState<VolumeData[]>([]);

  async function getVolumes() {
    try {
      const result = await invoke<VolumeData[]>("list_volumes");
      setVolumes(result);
      console.log(result);
    } catch (error) {
      console.error("Error getting volumes:", error);
    }
  }

  useEffect(() => {
    getVolumes();
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Volumes</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Create
        </button>
      </div>

      <div className="grid gap-4">
        {volumes.map(volume => (
          <div key={volume.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <HardDrive size={20} className="text-yellow-400" />
                <div className="truncate text-ellipsis max-w-lg select-text">
                  <h3 className="font-semibold text-white">{volume.Name}</h3>
                  <p className="text-sm text-gray-400 font-mono">{volume.Mountpoint}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  <p>Driver: {volume.Driver}</p>
                </div>
                <div className="text-sm text-gray-400 text-right">
                  <p>Created: {new Date(volume.CreatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

