<script>
  import { setRoute } from '#lib/router';
  import { pageWsCalendar } from '../../views/calendar';

  setRoute('calendar');
  let html = $derived(pageWsCalendar());
</script>

{@html html}
