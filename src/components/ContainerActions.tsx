import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { ContainerData } from "../pages/containers";
import { Loader2, Play, RotateCcw, Square, Trash2, Terminal, FileSearch, Folder } from "lucide-react";

export const ContainerActions: React.FC<{ container: ContainerData, onStateChanged: () => void }> = ({ container, onStateChanged }) => {
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
  
    const handleStartContainer = async () => {
      setIsStarting(true);
      await invoke("start_container", { id: container.id });
      setIsStarting(false);
      onStateChanged();
    };
  
    const handleStopContainer = async () => {
      setIsStopping(true);
      await invoke("stop_container", { id: container.id });
      setIsStopping(false);
      onStateChanged();
    };

    const handleRemoveContainer = async () => {
      setIsRemoving(true);
      await invoke("remove_container", { id: container.id });
      setIsRemoving(false);
      onStateChanged();
    };
  
  
    return (
      <div className="flex items-center gap-2">
        {container.state?.toLowerCase() === 'running' ? (
          <button
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
            type="button"
            aria-label="Stop container"
            onClick={handleStopContainer}
            disabled={isStopping}
          >
            {isStopping ?
              <Loader2 className="animate-spin" size={16} /> : <Square size={16} />
            }
            <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Stop container
            </span>
          </button>
        ) : (
          <button
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
            type="button"
            aria-label="Start container"
            onClick={handleStartContainer}
            disabled={isStarting}
          >
            {isStarting ?
              <Loader2 className="animate-spin" size={16} /> : <Play size={16} />
            }
            <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Start container
            </span>
  
          </button>
        )}
  
        {container.state?.toLowerCase() === 'running' && (
          <button
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
            type="button"
            aria-label="Restart container"
          >
            <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Restart container
            </span>
            <RotateCcw size={16} />
          </button>)}
  
        <button
          className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
          type="button"
          aria-label="Open terminal in container"
        >
          <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Open terminal
          </span>
          <Terminal size={16} />
        </button>
  
        <button
          className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
          type="button"
          aria-label="Search logs"
        >
          <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Search logs
          </span>
          <FileSearch size={16} />
        </button>
  
  
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-blue-400 transition-colors relative group"
          aria-label="View files"
        >
          <Folder size={16} />
          <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            View files
          </span>
        </button>
  
  
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-red-400 transition-colors relative group"
          aria-label="Remove container"
          onClick={handleRemoveContainer}
          disabled={isRemoving}
        >
          {isRemoving ?
            <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />
          }
          <span className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 whitespace-nowrap bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Remove container
          </span>
        </button>
      </div>
    );
  };
  