import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface VersionInfo {
  colima_version: string;
  lima_version: string;
  colima_checksum: string;
  lima_checksum: string;
  download_urls: {
    colima: string;
    lima: string;
  };
}

interface SecurityInfoProps {
  versionInfo: VersionInfo;
}

export function SecurityInfo({ versionInfo }: SecurityInfoProps) {
  const truncateChecksum = (checksum: string) => {
    return checksum.length > 32 ? `${checksum.substring(0, 32)}...` : checksum;
  };

  const truncateUrl = (url: string) => {
    const urlObj = new URL(url);
    const urlPath = `${urlObj.hostname}${urlObj.pathname}`;
    return urlPath.length > 32 ? `${urlPath.substring(0, 32)}...` : urlPath;
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <span>🔒</span>
          <span>Security Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-blue-800">
          <p className="mb-3">
            These binaries will be downloaded directly from official GitHub
            releases and verified using SHA256 checksums to ensure integrity and
            security.
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Colima Binary</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <Badge variant="outline" className="text-xs">
                    v{versionInfo.colima_version}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="font-mono text-blue-700">
                    <Link to={versionInfo.download_urls.colima} target="_blank">
                      {truncateUrl(versionInfo.download_urls.colima)}
                    </Link>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Checksum:</span>
                  <span className="font-mono text-blue-700">
                    {truncateChecksum(versionInfo.colima_checksum)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Lima Binary</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <Badge variant="outline" className="text-xs">
                    v{versionInfo.lima_version}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="font-mono text-blue-700">
                    {truncateUrl(versionInfo.download_urls.lima)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Checksum:</span>
                  <span className="font-mono text-blue-700">
                    {truncateChecksum(versionInfo.lima_checksum)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
