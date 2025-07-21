import { invoke } from "@tauri-apps/api/core";
import { Download, Search, Trash2, Upload, Cloud } from "lucide-react";
import { useEffect, useState } from "react";

interface ImageData {
  id: string;
  repository: string | null;
  tag: string | null;
  imageId: string;
  created: number;
  size: number;
  inUse: boolean;
}

function formatSize(size: number) {
  if (size < 1024) {
    return `${size.toFixed(2)} bytes`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} Kb`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} Mb`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} Gb`;
}

export const ImagesTab: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);

  async function getImages() {
    try {
      const result = await invoke<ImageData[]>("list_images");
      console.log(result);
      setImages(result);
    } catch (error) {
      console.error("Error getting images:", error);
    }
  }

  useEffect(() => {
    getImages();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const filteredImages = images;
  // const filteredImages = images.filter(image =>
  //   image.repository?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   image.tag?.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Images</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download size={16} />
            Pull
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Upload size={16} />
            Build
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredImages.map(image => (
          <div key={image.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 truncate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Cloud size={20} className="text-green-400" />
                <div className="truncate max-w-lg select-text">
                  <h3 className="font-semibold text-white truncate max-w-xxxl">{image.repository} : {image.tag}</h3>
                  <p className="text-sm text-gray-400 font-mono truncate text-ellipsis max-w-xxxl">{image.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${image.inUse ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">{image.inUse ? 'In Use' : 'Unused'}</span>
                </div>
                <div className="text-sm text-gray-400 text-right">
                  <p>Created: {new Date(image.created * 1000).toLocaleString()}</p>
                  <p>Size: {formatSize(image.size)}</p>
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