import { useState } from 'react';
import {
  HomebrewInstallation,
  BinaryInstallation,
} from '../components/lima-vm';
import { usePageAnalytics } from '../hooks/use-analytics';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

export default function LimaVMPage() {
  usePageAnalytics('lima-vm');
  const [activeTab, setActiveTab] = useState('homebrew');

  const handleInstallationComplete = () => {
    // Handle installation completion
    console.log('Installation completed successfully');
  };

  return (
    <div className="page-background min-h-screen flex flex-col">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="space-y-6 p-6 max-w-full">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">Lima VM</h1>
                <p className="text-muted-foreground mt-2">
                  Install and manage Colima VM for Docker on macOS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content section */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 max-w-full h-full overflow-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="homebrew">Homebrew Installation</TabsTrigger>
              <TabsTrigger value="binary">Binary Installation</TabsTrigger>
            </TabsList>

            <TabsContent value="homebrew" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Homebrew Installation</CardTitle>
                  <CardDescription>
                    Install Colima and Lima using Homebrew package manager
                    (recommended)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HomebrewInstallation />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="binary" className="mt-6">
              <BinaryInstallation onComplete={handleInstallationComplete} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
