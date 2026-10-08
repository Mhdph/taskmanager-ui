<script>
  import { setRoute } from '#lib/router';
  import { pageMembers } from '../../pages/members';

  setRoute('members');
  let html = $derived(pageMembers());
</script>

{@html html}
