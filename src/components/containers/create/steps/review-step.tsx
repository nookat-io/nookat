import { ReactNode, useEffect, useRef } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Switch } from '../../../ui/switch';
import { errorMessage } from '../../../../utils/error-message';
import {
  CreateContainerSpec,
  KeyValue,
  PortMapping,
  StorageMount,
} from '../create-container-types';
import { hostAddress } from '../docker-run-command';
import { shellQuote } from '../shell-words';
import { StepId, WizardAction } from '../wizard-state';
import {
  DEFAULT_NETWORK_LABEL,
  networkLabel,
  restartPolicyLabel,
} from '../wizard-options';

interface ReviewStepProps {
  spec: CreateContainerSpec;
  command: string;
  startAfterCreate: boolean;
  volumes: string[];
  failure: string | null;
  onEdit: (step: StepId) => void;
  dispatch: (action: WizardAction) => void;
}

const IMAGE_DEFAULT = 'Image default';

function describePort(port: PortMapping): string {
  const hostPort = port.host_port ?? 'random port';
  const host = port.host_ip
    ? `${hostAddress(port.host_ip)}:${hostPort}`
    : String(hostPort);
  return `${host} → ${port.container_port}/${port.protocol}`;
}

function describeMount(mount: StorageMount, volumes: string[]): string {
  const source =
    mount.kind === 'volume'
      ? `volume ${mount.source}${volumes.includes(mount.source) ? '' : ' (new)'}`
      : mount.source;
  return `${source} → ${mount.target}${mount.read_only ? ' (read-only)' : ''}`;
}

const describePair = ({ key, value }: KeyValue) => `${key}=${value}`;

function Lines({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">{empty}</span>;
  }
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={index} className="wrap-anywhere font-mono text-xs leading-5">
          {item}
        </li>
      ))}
    </ul>
  );
}

function SummarySection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepId;
  onEdit: (step: StepId) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button
          variant="link"
          size="sm"
          className="h-7 px-0"
          aria-label={`Edit ${title.toLowerCase()}`}
          onClick={() => onEdit(step)}
        >
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-3 py-2.5 text-sm">
        {children}
      </dl>
    </section>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function copyCommand(command: string) {
  navigator.clipboard.writeText(command).then(
    () => toast.success('Copied the docker command'),
    error => toast.error(`Failed to copy the command: ${errorMessage(error)}`)
  );
}

function FailureAlert({ message }: { message: string }) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alertRef.current?.scrollIntoView({ block: 'nearest' });
  }, [message]);

  return (
    <div
      ref={alertRef}
      role="alert"
      className="scroll-mb-5 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function ReviewStep({
  spec,
  command,
  startAfterCreate,
  volumes,
  failure,
  onEdit,
  dispatch,
}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <SummarySection title="Image" step="image" onEdit={onEdit}>
        <Row term="Image">
          <span className="font-mono">{spec.image}</span>
        </Row>
      </SummarySection>

      <SummarySection title="General" step="general" onEdit={onEdit}>
        <Row term="Name">{spec.name ?? 'Random name'}</Row>
        <Row term="Command">
          {spec.command ? (
            <span className="font-mono text-xs">
              {spec.command.map(shellQuote).join(' ')}
            </span>
          ) : (
            IMAGE_DEFAULT
          )}
        </Row>
        <Row term="Entrypoint">
          {spec.entrypoint ? (
            <span className="font-mono text-xs">{spec.entrypoint}</span>
          ) : (
            IMAGE_DEFAULT
          )}
        </Row>
        <Row term="Working directory">
          {spec.working_dir ? (
            <span className="font-mono text-xs">{spec.working_dir}</span>
          ) : (
            IMAGE_DEFAULT
          )}
        </Row>
        <Row term="Restart policy">
          {restartPolicyLabel(spec.restart_policy)}
        </Row>
        <Row term="Remove on exit">{spec.auto_remove ? 'Yes' : 'No'}</Row>
      </SummarySection>

      <SummarySection title="Ports" step="ports" onEdit={onEdit}>
        <Row term="Published">
          <Lines items={spec.ports.map(describePort)} empty="None" />
        </Row>
      </SummarySection>

      <SummarySection title="Storage" step="storage" onEdit={onEdit}>
        <Row term="Mounts">
          <Lines
            items={spec.mounts.map(mount => describeMount(mount, volumes))}
            empty="None"
          />
        </Row>
      </SummarySection>

      <SummarySection title="Environment" step="environment" onEdit={onEdit}>
        <Row term="Variables">
          <Lines items={spec.env.map(describePair)} empty="None" />
        </Row>
        <Row term="Labels">
          <Lines items={spec.labels.map(describePair)} empty="None" />
        </Row>
      </SummarySection>

      <SummarySection
        title="Network and resources"
        step="network"
        onEdit={onEdit}
      >
        <Row term="Network">
          {spec.network ? networkLabel(spec.network) : DEFAULT_NETWORK_LABEL}
        </Row>
        <Row term="CPU limit">
          {spec.cpus === null ? 'No limit' : `${spec.cpus} CPUs`}
        </Row>
        <Row term="Memory limit">
          {spec.memory_mb === null ? 'No limit' : `${spec.memory_mb} MiB`}
        </Row>
      </SummarySection>

      <section className="rounded-md border bg-muted/40">
        <div className="flex items-center justify-between border-b px-3 py-1.5">
          <h4 className="text-sm font-medium" id="docker-command-heading">
            Equivalent docker command
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => copyCommand(command)}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
        <pre
          aria-labelledby="docker-command-heading"
          className="max-h-40 overflow-y-auto whitespace-pre-wrap wrap-anywhere px-3 py-2.5 font-mono text-xs leading-5"
        >
          {command}
        </pre>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <Label htmlFor="start-after-create">
          Start the container after creating it
        </Label>
        <Switch
          id="start-after-create"
          checked={startAfterCreate}
          onCheckedChange={checked =>
            dispatch({ type: 'set', field: 'startAfterCreate', value: checked })
          }
        />
      </div>

      {failure && <FailureAlert message={failure} />}
    </div>
  );
}
