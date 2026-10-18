import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/timeline')({
  ssr: false,
  component: WorkspaceRoute,
});
