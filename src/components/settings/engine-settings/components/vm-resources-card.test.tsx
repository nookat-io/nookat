import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VmResourcesCard } from './vm-resources-card';

describe('VmResourcesCard', () => {
  it('labels every resource control, including the architecture picker', () => {
    render(
      <VmResourcesCard
        dockerInfo={null}
        config={{ cpu: 2, memory: 4, disk: 60, architecture: 'aarch64' }}
        onConfigChange={() => {}}
        isEngineRunning={false}
      />
    );

    expect(screen.getByLabelText('CPU Cores')).toHaveValue(2);
    expect(screen.getByLabelText('Memory (GB)')).toHaveValue(4);
    expect(screen.getByLabelText('Disk (GB)')).toHaveValue(60);
    expect(
      screen.getByRole('combobox', { name: 'Architecture' })
    ).toHaveTextContent('ARM64');
  });
});
