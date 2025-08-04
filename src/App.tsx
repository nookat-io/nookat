import { Routes, Route } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider, useThemeContext } from './lib/theme-provider';
import { LoadingScreen } from './components/ui/loading-spinner';
import {
  AptabaseProvider,
  APTABASE_APP_KEY,
  APP_VERSION,
} from './lib/analytics';

import ContainersPage from './pages/ContainersPage';
import ImagesPage from './pages/ImagesPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import SettingsPage from './pages/SettingsPage';
import { usePageAnalytics } from './hooks/use-page-analytics';

function AppContent() {
  const { loading } = useThemeContext();

  usePageAnalytics('app_started');

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
    <AptabaseProvider
      appKey={APTABASE_APP_KEY}
      options={{ appVersion: APP_VERSION }}
    >
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AptabaseProvider>
  );
}

export default App;
