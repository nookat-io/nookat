

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'running':
          return 'bg-green-500';
        case 'stopped':
          return 'bg-red-500';
        case 'paused':
          return 'bg-yellow-500';
        case 'restarting':
          return 'bg-blue-500';
        case 'exited':
          return 'bg-gray-500';
        case 'dead':
          return 'bg-gray-500';
        case 'created':
          return 'bg-gray-500';
        case 'removing':
          return 'bg-gray-500';
        default:
          return 'bg-gray-500';
      }
    };
  
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
        <span className="text-sm font-medium capitalize">{status}</span>
      </div>
    );
  };