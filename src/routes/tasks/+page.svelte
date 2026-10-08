<script>
  import { setRoute } from '#lib/router';
  import { pageTasks } from '../../pages/tasks';

  setRoute('tasks');
  let html = $derived(pageTasks());
</script>

{@html html}
