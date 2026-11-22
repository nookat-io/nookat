import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageHeader } from './image-header';
import { Image } from './image-types';

const row = (reference: string, imageId: string): Image => {
  const [repository, tag] = reference.split(':');
  return {
    id: reference,
    repository,
    tag,
    image_id: imageId,
    created: 1_700_000_000,
    size: 1024,
    in_use: false,
    dangling: false,
  };
};

describe('ImageHeader', () => {
  it('counts images, not tags', () => {
    render(
      <ImageHeader
        selectedImages={[]}
        images={[
          row('app:1.0', 'sha256:abc'),
          row('app:latest', 'sha256:abc'),
          row('db:16', 'sha256:def'),
        ]}
        onImagesDeleted={() => {}}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText(/2 images found/)).toBeInTheDocument();
  });
});
