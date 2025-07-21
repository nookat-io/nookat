'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';

export function ProxySettings() {
  const [proxy, setProxy] = useState({
    enableProxy: false,
    httpProxy: '',
    httpsProxy: '',
    noProxy: 'localhost,127.0.0.1',
    proxyAuth: false,
    username: '',
    password: '',
  });

  const handleProxyChange = (key: string, value: string | boolean) => {
    setProxy(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HTTP/HTTPS Proxy</CardTitle>
          <CardDescription>
            Configure proxy settings for Docker daemon and registry access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Proxy</Label>
              <div className="text-sm text-muted-foreground">
                Use proxy server for Docker registry connections
              </div>
            </div>
            <Switch 
              checked={proxy.enableProxy}
              onCheckedChange={(checked) => handleProxyChange('enableProxy', checked)}
            />
          </div>
          
          {proxy.enableProxy && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="http-proxy">HTTP Proxy</Label>
                <Input
                  id="http-proxy"
                  placeholder="http://proxy.example.com:8080"
                  value={proxy.httpProxy}
                  onChange={(e) => handleProxyChange('httpProxy', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="https-proxy">HTTPS Proxy</Label>
                <Input
                  id="https-proxy"
                  placeholder="https://proxy.example.com:8080"
                  value={proxy.httpsProxy}
                  onChange={(e) => handleProxyChange('httpsProxy', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="no-proxy">No Proxy</Label>
                <Input
                  id="no-proxy"
                  placeholder="localhost,127.0.0.1,*.local"
                  value={proxy.noProxy}
                  onChange={(e) => handleProxyChange('noProxy', e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Comma-separated list of domains to bypass proxy
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {proxy.enableProxy && (
        <Card>
          <CardHeader>
            <CardTitle>Proxy Authentication</CardTitle>
            <CardDescription>
              Configure authentication for proxy server access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Authentication</Label>
                <div className="text-sm text-muted-foreground">
                  Proxy server requires username and password
                </div>
              </div>
              <Switch 
                checked={proxy.proxyAuth}
                onCheckedChange={(checked) => handleProxyChange('proxyAuth', checked)}
              />
            </div>
            
            {proxy.proxyAuth && (
              <>
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proxy-username">Username</Label>
                    <Input
                      id="proxy-username"
                      value={proxy.username}
                      onChange={(e) => handleProxyChange('username', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="proxy-password">Password</Label>
                    <Input
                      id="proxy-password"
                      type="password"
                      value={proxy.password}
                      onChange={(e) => handleProxyChange('password', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Test Connection</Button>
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}