<script>
  import { setRoute } from '#lib/router';
  import { pageNotifications } from '../../pages/notifications';

  setRoute('notifications');
  let html = $derived(pageNotifications());
</script>

{@html html}
