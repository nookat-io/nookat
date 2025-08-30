# Docker Image Autocompletion System

This document describes the implementation of the comprehensive Docker image autocompletion and autosuggestion system in the Nookat project, as specified in ticket IMAGE-007-pull-suggestion.md.

## Overview

The system provides two main components:

1. **DockerImageAutocomplete** - Real-time search for Docker Hub images
2. **DockerImageSelector** - Local Docker image selection with filtering

## Components

### 1. DockerImageAutocomplete

A React component that provides real-time search for Docker Hub images with the following features:

- **Real-time search** with 300ms debouncing
- **Docker Hub API integration** via Tauri backend
- **Smart result sorting**: Official images first, then by star count
- **Rich image information**: name, description, star count, pull count, official status, automated status
- **Result limiting**: Maximum 10 results
- **Auto-tagging**: Automatically appends `:latest` when an image is selected
- **Loading states** with spinner indicators
- **Error handling** with graceful fallbacks
- **Keyboard navigation** support (arrow keys, Enter, Escape)
- **Click-outside handling** to close dropdowns

#### Usage

```tsx
import { DockerImageAutocomplete } from '../components/ui/DockerImageAutocomplete';

function MyComponent() {
  const [selectedImage, setSelectedImage] = useState('');

  return (
    <DockerImageAutocomplete
      value={selectedImage}
      onChange={setSelectedImage}
      placeholder="Search Docker Hub images..."
      className="w-full"
    />
  );
}
```

#### Props

- `value: string` - Current selected image value
- `onChange: (value: string) => void` - Callback when image is selected
- `placeholder?: string` - Input placeholder text
- `className?: string` - Additional CSS classes

### 2. DockerImageSelector

A React component for selecting local Docker images with the following features:

- **Local image discovery** using Docker CLI commands via Tauri
- **Client-side filtering** for instant search results
- **Image metadata display**: ID, repository, tag, size, creation date, full name
- **Filtering logic**: Search by image name, repository, or ID
- **Loading and error states** with retry functionality
- **Empty state handling** when no images are found
- **Keyboard navigation** support
- **Click-outside handling**

#### Usage

```tsx
import { DockerImageSelector } from '../components/ui/DockerImageSelector';
import { LocalDockerImage } from '../types/docker-images';

function MyComponent() {
  const [selectedImage, setSelectedImage] = useState<LocalDockerImage | null>(
    null
  );

  return (
    <DockerImageSelector
      onImageSelect={setSelectedImage}
      disabled={false}
      className="w-full"
    />
  );
}
```

#### Props

- `onImageSelect: (image: LocalDockerImage | null) => void` - Callback when image is selected
- `disabled?: boolean` - Whether the component is disabled
- `className?: string` - Additional CSS classes

## Backend Integration

### Tauri Commands

The system uses the following Tauri commands for Docker operations:

1. **`search_docker_hub(query: string)`** - Searches Docker Hub API
2. **`check_docker_access()`** - Verifies Docker daemon accessibility
3. **`get_docker_images_cli()`** - Lists local Docker images via CLI
4. **`export_docker_image(image_name: string, output_path: string)`** - Exports images to tar files
5. **`inspect_docker_image(image_name: string)`** - Gets detailed image information

### Docker CLI Commands Used

```bash
# Check Docker version and accessibility
docker version --format "{{.Client.Version}}"

# List all Docker images with formatted output
docker images --format "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Digest}}\t{{.Size}}\t{{.CreatedAt}}"

# Export Docker image to tar file
docker save "imageName" -o "outputPath.tar"

# Inspect Docker image details
docker inspect "imageName"
```

## Data Types

### DockerHubImage

```typescript
interface DockerHubImage {
  name: string;
  description: string;
  star_count: number;
  pull_count: number;
  is_official: boolean;
  is_automated: boolean;
}
```

### LocalDockerImage

```typescript
interface LocalDockerImage {
  id: string;
  repository: string;
  tag: string;
  digest: string;
  size: string;
  created: string;
  fullName: string;
}
```

## Utility Functions

### Docker Library (`src/lib/docker.ts`)

- `checkDockerAccess()` - Check Docker daemon accessibility
- `listDockerImages()` - List local Docker images
- `exportDockerImage()` - Export images to tar files
- `inspectDockerImage()` - Get detailed image information
- `searchDockerHub()` - Search Docker Hub for images
- `formatNumber()` - Format large numbers with K, M, B suffixes
- `parseDockerImagesOutput()` - Parse Docker CLI output

## Integration Example

The components are integrated into the `ImagesPage` component, providing a comprehensive Docker image management interface:

```tsx
// Docker Image Management Section
<div className="p-6 max-w-full">
  <div className="bg-card border rounded-lg p-6">
    <h2 className="text-xl font-semibold mb-4">Docker Image Management</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Docker Hub Image Search */}
      <div>
        <h3 className="text-lg font-medium mb-3">Search Docker Hub</h3>
        <DockerImageAutocomplete
          value={dockerHubImage}
          onChange={setDockerHubImage}
          placeholder="Search for Docker Hub images..."
          className="w-full"
        />
      </div>

      {/* Local Docker Image Selector */}
      <div>
        <h3 className="text-lg font-medium mb-3">Select Local Image</h3>
        <DockerImageSelector
          onImageSelect={setLocalDockerImage}
          className="w-full"
        />
      </div>
    </div>
  </div>
</div>
```

## Features

### Performance Optimizations

- **Debounced search** (300ms) to avoid excessive API calls
- **Client-side filtering** for local images
- **Result limiting** to 10 items for Docker Hub search
- **Proper cleanup** of event listeners and timers

### Error Handling

- **Network failures** gracefully handled
- **Docker daemon accessibility** checks
- **Timeout protection** for API calls
- **User-friendly error messages** with retry mechanisms

### Accessibility

- **Keyboard navigation** support
- **ARIA labels** and proper focus management
- **Screen reader** friendly
- **High contrast** support via Tailwind CSS

### UI/UX Features

- **Loading spinners** and progress indicators
- **Responsive design** with mobile support
- **Hover effects** and visual feedback
- **Consistent styling** using Tailwind CSS
- **Tooltips** for additional information

## Dependencies

- **React 18+** with hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Tauri** for backend integration

## Future Enhancements

1. **Image pulling** functionality integration
2. **Advanced filtering** options (by architecture, OS, etc.)
3. **Image comparison** tools
4. **Bulk operations** support
5. **Image history** and version management
6. **Custom registry** support
7. **Image security** scanning integration

## Testing

The components can be tested by:

1. **Building the project**: `npm run build`
2. **Running in development**: `npm run dev`
3. **Testing Tauri commands**: `npm run tauri dev`

## Troubleshooting

### Common Issues

1. **Docker daemon not accessible**: Ensure Docker is running and accessible
2. **Network errors**: Check internet connectivity and Docker Hub API access
3. **Permission denied**: Verify Docker CLI permissions
4. **Build errors**: Ensure all dependencies are properly installed

### Debug Information

- Check browser console for frontend errors
- Check Tauri logs for backend errors
- Verify Docker CLI commands work in terminal
- Check network requests in browser dev tools

## Contributing

When contributing to this system:

1. **Follow TypeScript** best practices
2. **Maintain accessibility** standards
3. **Add proper error handling** for new features
4. **Update documentation** for API changes
5. **Test with various Docker environments**
6. **Ensure responsive design** works on all screen sizes

## License

This implementation follows the same license as the Nookat project.
