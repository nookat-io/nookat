import { mockIPC } from '@tauri-apps/api/mocks';
import {
  Container,
  ContainerState,
} from '../components/containers/container-types';

export function aContainer(
  name: string,
  state: ContainerState,
  overrides: Partial<Container> = {}
): Container {
  return {
    id: `${name}-id`,
    names: [`/${name}`],
    image: `${name}-image`,
    state,
    ...overrides,
  };
}

export const inComposeProject = (project: string): Partial<Container> => ({
  labels: { 'com.docker.compose.project': project },
});

export interface SentCommand {
  cmd: string;
  args: unknown;
}

export type CommandHandlers = Partial<
  Record<string, (args: Record<string, unknown>) => unknown>
>;

export function recordCommands(
  handlers: CommandHandlers,
  options: { shouldMockEvents?: boolean } = {}
): SentCommand[] {
  const sent: SentCommand[] = [];
  mockIPC((cmd, args) => {
    const handler = handlers[cmd];
    if (!handler) {
      throw new Error(`Unexpected command ${cmd}`);
    }
    sent.push({ cmd, args });
    return handler(args as Record<string, unknown>);
  }, options);
  return sent;
}

export const succeedsFor = ({ ids }: Record<string, unknown>) => ({
  succeeded: ids,
  failed: [],
});
