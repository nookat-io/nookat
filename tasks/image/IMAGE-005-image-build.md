# [IMAGE-005] Image build feature

**Is your feature request related to a problem? Please describe.**

Currently, users need to use command-line tools like `docker build` to create images from Dockerfiles, which requires leaving the Nookat interface and using external terminals. This creates a disconnected workflow where users must switch between Nookat for container management and command-line tools for image building.

Additionally, beginners may find the command-line interface intimidating and prefer a more visual approach to building Docker images.

**Describe the solution you'd like**
I'd like to see an integrated Dockerfile build interface within Nookat that provides:

1. **Build Interface Access**: A "Build from Dockerfile" button (or drop-down item from Pull button) in the Images page that opens a dedicated build interface
2. **Dockerfile Selection**: Multiple ways to specify the build context:
   - File picker to select existing Dockerfile
   - [Option] Drag-and-drop support for Dockerfile and build context
3. **Build Configuration Panel**:
   - Image name and tag specification
   - Build context directory selection
   - Build arguments (ARG) management with key-value pairs
   - Build options (--no-cache, --pull, --squash, etc.)
4. **Real-time Build Progress**:
   - Live build log output
   - Step-by-step progress indicator
   - Layer-by-layer build visualization
   - Error highlighting and suggestions

**Describe alternatives you've considered**

1. **Terminal Integration**: Embedding a terminal within Nookat, but this would be less user-friendly and harder to use
2. **External Build Tool Integration**: Launching Docker Desktop or other build tools, but this breaks the unified experience
3. **Simple Command Interface**: Just a text input for docker build commands, but this lacks the visual feedback and ease of use
4. **Template-based Building**: Pre-defined build templates only, but this would be too limiting for custom use cases
5. **File-based Build**: Only supporting existing Dockerfiles without editing capabilities, but this would miss the opportunity for inline editing

**Additional context**
This feature would significantly enhance Nookat's capabilities by:

- **Unified Workflow**: Keeping users within the Nookat interface for the complete container lifecycle
- **Beginner-Friendly**: Providing a visual alternative to command-line Docker builds
- **Real-time Feedback**: Offering immediate visual feedback during the build process
- **Error Handling**: Making build errors more accessible with highlighted output and suggestions
- **Build Optimization**: Helping users understand and optimize their build process
- **Integration**: Seamlessly connecting with existing image management features

The implementation should:

- Leverage the existing Rust backend (bollard-rs) for Docker API communication
- Use streaming APIs for real-time build log updates
- Maintain consistency with the current React/TypeScript frontend
- Follow Nookat's modern UI design principles with Tailwind CSS
- Support both simple and complex multi-stage builds
- Provide proper error handling and user feedback

**Technical Considerations**:

- Build context handling and file system access
- Streaming build output for real-time updates
- Build cancellation and cleanup
- Integration with existing image management
- Performance optimization for large build contexts

**Priority**: High - This would be a core feature that completes the image management workflow and makes Nookat a comprehensive container management solution.

**Estimated Complexity**: High - Requires significant backend work for build process management, streaming APIs, file system integration, and complex frontend state management for real-time updates.
