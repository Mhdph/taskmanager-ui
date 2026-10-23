import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TaskDeliveries } from './TaskDeliveries';

export function TaskDeliveryPortal({ projectId, taskId }: { projectId: string; taskId: string }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setContainer(document.getElementById(`task-deliveries-${taskId}`));
  }, [taskId]);
  return container ? createPortal(<TaskDeliveries key={`${projectId}:${taskId}`} projectId={projectId} taskId={taskId} />, container) : null;
}
