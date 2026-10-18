import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/notifications')({
  ssr: false,
  component: WorkspaceRoute,
});
