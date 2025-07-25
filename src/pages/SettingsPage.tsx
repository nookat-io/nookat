import { EngineSettings } from '../components/settings/engine-settings';
import { ResourceSettings } from '../components/settings/resource-settings';
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
    <div className="page-background min-h-screen">
      <div className="space-y-6 p-6 max-w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 via-transparent to-zinc-500/10 rounded-2xl blur-3xl"></div>
          <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 light-gradient-slate dark:bg-card/50">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-400 to-zinc-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure Docker engine and application preferences
            </p>
          </div>
        </div>

        <div className="content-section">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="engine">Engine</TabsTrigger>
              <TabsTrigger value="proxy">Proxy</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>

            <TabsContent value="resources">
              <ResourceSettings />
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
