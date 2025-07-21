import { Network, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface NetworkData {
  Attachable: boolean;
  ConfigFrom: boolean;
  ConfigOnly: boolean;
  Containers: string[];
  Created: string;
  Driver: string;
  EnableIPv6: boolean;
  Id: string;
  Ingress: boolean;
  Internal: boolean;
  Labels: string[];
  Name: string;
  Options: string[];
  Scope: string;
}

function formatContainers(containers: string[] | null | undefined) {
  if (!Array.isArray(containers) || containers.length === 0) {
    return "No containers";
  }
  return containers.join(", ");
}

function formatCreated(created: string) {
  return new Date(created).toLocaleString();
}

export const NetworksTab: React.FC = () => {
  const [networks, setNetworks] = useState<NetworkData[]>([]);

  async function getNetworks() {
    try {
      const result = await invoke<NetworkData[]>("list_networks");
      setNetworks(result);
      console.log(result);
    } catch (error) {
      console.error("Error getting networks:", error);
    }
  }

  useEffect(() => {
    getNetworks();
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Networks</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Create
        </button>
      </div>

      <div className="grid gap-4">
        {networks.map(network => (
          <div key={network.Id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Network size={20} className="text-purple-400" />
                <div className="select-text">
                  <h3 className="font-semibold text-white">{network.Name}</h3>
                  <p className="text-sm text-gray-400">Driver: {network.Driver}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-sm text-gray-400">
                  <p>Scope: {network.Scope}</p>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Containers: {formatContainers(network.Containers)}</p>
                </div>
                <div className="text-sm text-gray-400 text-right">
                  <p>Created: {formatCreated(network.Created)}</p>
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
