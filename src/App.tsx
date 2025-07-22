import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/sidebar';
import { Header } from './components/layout/header';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './lib/theme-provider';
import { Window } from '@tauri-apps/api/window';
import ContainersPage from './pages/ContainersPage';
import ImagesPage from './pages/ImagesPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const handleMinimize = () => Window.getCurrent().minimize();
  const handleMaximize = () => Window.getCurrent().toggleMaximize();
  const handleClose = () => Window.getCurrent().close();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
    >
      <div className="min-h-screen">
        {/* Custom Window Frame */}
        <div className="window-frame h-8 flex items-center justify-between px-4 no-select">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition-colors window-controls"
              onClick={handleClose}
              title="Close"
            ></div>
            <div 
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors window-controls"
              onClick={handleMinimize}
              title="Minimize"
            ></div>
            <div 
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors window-controls"
              onClick={handleMaximize}
              title="Maximize"
            ></div>
          </div>
          <div className="flex-1 text-center select-none" data-tauri-drag-region>
            <span className="text-sm font-medium text-foreground/70">Nookat</span>
          </div>
          <div className="w-12"></div>
        </div>
        
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <Routes>
                  <Route path="/" element={<ContainersPage />} />
                  <Route path="/images" element={<ImagesPage />} />
                  <Route path="/networks" element={<NetworksPage />} />
                  <Route path="/volumes" element={<VolumesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App; 