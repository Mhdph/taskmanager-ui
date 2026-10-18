import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceRoute } from '../lib/components/WorkspaceRoute';

export const Route = createFileRoute('/members_/$id')({
  ssr: false,
  component: WorkspaceRoute,
});
