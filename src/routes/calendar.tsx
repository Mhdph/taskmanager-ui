import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/calendar')({
  ssr: false,
  component: WorkspaceRoute,
});
