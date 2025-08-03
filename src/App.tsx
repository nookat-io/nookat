import { Routes, Route } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider, useThemeContext } from './lib/theme-provider';
import { LoadingScreen } from './components/ui/loading-spinner';
import ContainersPage from './pages/ContainersPage';
import ImagesPage from './pages/ImagesPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { loading } = useThemeContext();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex pt-6" data-tauri-drag-region>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<ContainersPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/networks" element={<NetworksPage />} />
            <Route path="/volumes" element={<VolumesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
