import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/inbox')({
  ssr: false,
  component: WorkspaceRoute,
});
