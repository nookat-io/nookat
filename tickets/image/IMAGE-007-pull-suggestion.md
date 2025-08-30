# Docker Image Autocompletion System

I need you to implement a comprehensive Docker image autocompletion and autosuggestion system in my React project, similar to the one used in HarborGuard. The system should have two main components: one for searching Docker Hub images and another for selecting local Docker images.

### **Requirements:**

#### **1. Docker Hub Image Autocompletion Component (`DockerImageAutocomplete`)**

- **Real-time search** with 300ms debouncing to avoid excessive API calls
- **Integration with Docker Hub's public search API** (`https://index.docker.io/v1/search`)
- **Smart result sorting**: Official images first, then by star count (descending)
- **Rich image information display**: name, description, star count, pull count, official status, automated status
- **Result limiting**: Show maximum 10 results
- **Auto-tagging**: Automatically append `:latest` when an image is selected
- **Loading states** with spinner indicators
- **Error handling** with graceful fallbacks

#### **2. Local Docker Image Selector Component (`DockerImageSelector`)**

- **Local image discovery** using Docker CLI commands
- **Client-side filtering** for instant search results
- **Image metadata display**: ID, repository, tag, size, creation date, full name
- **Filtering logic**: Search by image name, repository, or ID
- **Loading and error states** with retry functionality
- **Empty state handling** when no images are found

#### **3. Backend API Routes**

- **`/api/docker/search`**: Proxy to Docker Hub search API with query parameter `q`
- **`/api/docker/images`**: List local Docker images using Docker CLI
- **Proper error handling** and HTTP status codes
- **User-Agent headers** for Docker Hub API calls

#### **4. Docker Integration Library**

- **`checkDockerAccess()`**: Verify Docker daemon accessibility
- **`listDockerImages()`**: Execute `docker images` command and parse output
- **`exportDockerImage()`**: Export images to tar files
- **`inspectDockerImage()`**: Get detailed image information
- **Proper timeout handling** and error management

### **Technical Specifications:**

#### **Component Props:**

```typescript
interface DockerImageAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface DockerImageSelectorProps {
  onImageSelect: (image: DockerImage | null) => void;
  disabled?: boolean;
  className?: string;
}
```

#### **Data Interfaces:**

```typescript
interface DockerHubImage {
  name: string;
  description: string;
  star_count: number;
  pull_count: number;
  is_official: boolean;
  is_automated: boolean;
}

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

#### **Key Features to Implement:**

1. **Debounced search** with useCallback and useRef for timers
2. **Click-outside handling** to close dropdowns
3. **Loading spinners** and error states
4. **Responsive dropdown positioning** with proper z-index
5. **Number formatting** for large values (K, M, B suffixes)
6. **Accessibility features** (keyboard navigation, ARIA labels)
7. **TypeScript support** with proper type definitions

#### **UI Components Needed:**

- Search input with search icon
- Dropdown with scrollable results
- Image cards showing metadata
- Loading indicators
- Error messages with retry buttons
- Empty state placeholders

#### **Performance Considerations:**

- Debounce search queries (300ms)
- Limit API results to 10 items
- Client-side filtering for local images
- Proper cleanup of event listeners
- Memory leak prevention with useEffect cleanup

#### **Error Handling:**

- Network failures gracefully handled
- Docker daemon accessibility checks
- Timeout protection for API calls
- User-friendly error messages
- Retry mechanisms where appropriate

### **Implementation Steps:**

1. Create the Docker integration library with CLI commands
2. Implement the API routes for search and local images
3. Build the DockerImageAutocomplete component with Docker Hub integration
4. Build the DockerImageSelector component for local images
5. Add proper TypeScript types and interfaces
6. Implement error handling and loading states
7. Add accessibility features and keyboard navigation
8. Test with various Docker environments and error conditions

### **Dependencies:**

- React 18+ with hooks
- TypeScript for type safety
- Tailwind CSS or similar for styling
- Tabler icons or similar icon library
- Next.js API routes (or equivalent backend framework)

### **Expected Behavior:**

- Users can type to search Docker Hub images with real-time suggestions
- Local Docker images are instantly searchable and filterable
- Selection automatically formats image names with appropriate tags
- System gracefully handles errors and provides user feedback
- Components are reusable and integrate well with existing forms

Please implement this system with clean, maintainable code, proper error handling, and excellent user experience. Include all necessary imports, type definitions, and ensure the components are fully functional and accessible.

---

## **Additional Implementation Notes:**

### **Docker CLI Commands Used:**

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

### **API Response Format Examples:**

#### **Docker Hub Search API Response:**

```json
{
  "results": [
    {
      "name": "nginx",
      "description": "Official build of Nginx.",
      "star_count": 15000,
      "pull_count": 1000000000,
      "is_official": true,
      "is_automated": false
    }
  ]
}
```

#### **Local Docker Images Response:**

```json
[
  {
    "id": "sha256:abc123",
    "repository": "nginx",
    "tag": "latest",
    "digest": "sha256:def456",
    "size": "133MB",
    "created": "2023-12-01 15:30:45 +0000 UTC",
    "fullName": "nginx:latest"
  }
]
```

### **Styling Classes (Tailwind CSS):**

- Container: `relative docker-autocomplete-container`
- Input: `pl-10` (left padding for search icon)
- Dropdown: `z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-72 overflow-y-auto`
- Loading spinner: `animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full`
- Image cards: `w-full justify-start p-3 h-auto text-left hover:bg-muted/50`

### **Event Handling:**

- Input change: Triggers debounced search
- Focus: Shows dropdown if suggestions exist
- Click outside: Closes dropdown
- Image selection: Updates value and closes dropdown
- Keyboard navigation: Arrow keys, Enter, Escape

### **Error Scenarios to Handle:**

- Docker daemon not running
- Network connectivity issues
- Docker Hub API rate limiting
- Invalid image names
- Permission denied errors
- Timeout scenarios

This comprehensive prompt should give any LLM all the details needed to implement the complete Docker image autocompletion system.
