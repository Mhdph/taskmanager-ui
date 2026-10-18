import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/my-tasks')({
  ssr: false,
  component: WorkspaceRoute,
});
