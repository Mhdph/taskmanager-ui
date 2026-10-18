/* =====================================================================
   ACTIONS · ARCHIVE: restore and purge
   ===================================================================== */
import { esc } from '../core/utils';
import { logAct, task } from '../core/store';
import { mutate, toast } from '../ui/toast';
import { A, confirmDlg, deleteTasks } from './actions';
import * as sync from '#lib/sync';

A.restoreTask = el => {
  const t = task(el.dataset.id);
  if (
    mutate(() => {
      t.archived = false;
      t.archivedAt = null;
      logAct('restored', t);
    })
  ) {
    sync.setArchived(t, false);
    toast(`بازیابی شد “${t.title}”`, { action: 'باز', onAction: () => A.openTask({ dataset: { id: t.id } }) });
  }
};
A.purgeTask = el => {
  const t = task(el.dataset.id);
  confirmDlg({
    title: 'کار برای همیشه حذف شود؟',
    body: `<b>${esc(t.title)}</b>، زیرکارها، دیدگاه‌ها و پیوست‌های آن برای همه حذف می‌شوند. این عملیات قابل بازگشت نیست.`,
    ok: 'حذف دائمی',
    danger: true,
    run: () => {
      if (mutate(() => deleteTasks([t.id]))) toast(`حذف شد “${t.title}”`);
    },
  });
};
