import { EngineSettings } from '../components/settings/engine-settings';
import { ProxySettings } from '../components/settings/proxy-settings';
import { GeneralSettings } from '../components/settings/general-settings';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';

export default function SettingsPage() {
  return (
    <div className="page-background min-h-screen flex flex-col">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="space-y-6 p-6 max-w-full">
          <div className="border border-border/50 rounded-2xl p-6 dark:bg-card/50 w-full flex flex-col items-start justify-start">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start justify-start">
                <h1 className="text-3xl font-bold bg-clip-text">Settings</h1>
                <p className="text-muted-foreground mt-2">
                  Configure Docker engine and application preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content section */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 max-w-full h-full overflow-auto">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="engine">Engine</TabsTrigger>
              <TabsTrigger value="proxy">Proxy</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>

            <TabsContent value="engine">
              <EngineSettings />
            </TabsContent>

            <TabsContent value="proxy">
              <ProxySettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
