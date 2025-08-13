import { Routes, Route } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider, useThemeContext } from './lib/theme-provider';
import { SentryProvider } from './lib/sentry-provider';
import { LoadingScreen } from './components/ui/loading-spinner';
import {
  AptabaseProvider,
  APTABASE_APP_KEY,
  APP_VERSION,
  isAptabaseReleaseEnabled,
} from './lib/analytics';

import ContainersPage from './pages/ContainersPage';
import ImagesPage from './pages/ImagesPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import SettingsPage from './pages/SettingsPage';
import { usePageAnalytics } from './hooks/use-analytics';
import { EngineStatusProvider } from './lib/engine-status-provider';
import EngineErrorBoundary from './components/ui/engine-error';

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
        <EngineStatusProvider>
          <Header />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <EngineErrorBoundary>
                    <ContainersPage />
                  </EngineErrorBoundary>
                }
              />
              <Route
                path="/images"
                element={
                  <EngineErrorBoundary>
                    <ImagesPage />
                  </EngineErrorBoundary>
                }
              />
              <Route
                path="/networks"
                element={
                  <EngineErrorBoundary>
                    <NetworksPage />
                  </EngineErrorBoundary>
                }
              />
              <Route
                path="/volumes"
                element={
                  <EngineErrorBoundary>
                    <VolumesPage />
                  </EngineErrorBoundary>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </EngineStatusProvider>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AptabaseProvider
      appKey={APTABASE_APP_KEY}
      options={{
        appVersion: APP_VERSION,
        isDebug: !isAptabaseReleaseEnabled(),
      }}
    >
      <SentryProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SentryProvider>
    </AptabaseProvider>
  );
}

export default App;
