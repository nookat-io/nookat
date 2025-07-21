import { useState } from 'react';
import { Container, Cloud, Network, HardDrive, Monitor } from 'lucide-react';
import { ContainersTab } from './pages/containers';
import { ImagesTab } from './pages/images';
import { NetworksTab } from './pages/networks';
import { VolumesTab } from './pages/volumes';
import { SystemTab } from './pages/system';


function App() {
  const [activeTab, setActiveTab] = useState('containers');

  const tabs = [
    { id: 'containers', label: 'Containers', icon: Container },
    { id: 'images', label: 'Images', icon: Cloud },
    { id: 'networks', label: 'Networks', icon: Network },
    { id: 'volumes', label: 'Volumes', icon: HardDrive },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'containers':
        return <ContainersTab />;
      case 'images':
        return <ImagesTab />;
      case 'networks':
        return <NetworksTab />;
      case 'volumes':
        return <VolumesTab />;
      case 'system':
        return <SystemTab />;
      default:
        return <ContainersTab />;
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Fixed Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 select-none flex-shrink-0" data-tauri-drag-region>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Nookat Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Nookat</h1>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <nav className="w-64 bg-gray-800 border-r border-gray-700 flex-shrink-0 select-none">
          <div className="p-4">
            <div className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto select-none">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;