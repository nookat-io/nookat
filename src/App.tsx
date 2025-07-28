import { Routes, Route } from 'react-router-dom';
import { Sidebar, Header, WindowFrame } from './components/layout';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './lib/theme-provider';
import ContainersPage from './pages/ContainersPage';
import ImagesPage from './pages/ImagesPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WindowFrame>
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
      </WindowFrame>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
