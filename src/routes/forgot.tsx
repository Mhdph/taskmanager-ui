import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/forgot')({
  ssr: false,
  component: WorkspaceRoute,
});
