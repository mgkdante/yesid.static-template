<script lang="ts">
  import { site } from '#lib/config/site.ts';
</script>
<footer>
  <p>{site.business.name}</p>
  {#if site.business.phone}<p><a href={`tel:${site.business.phone}`}>{site.business.phone}</a></p>{/if}
  {#if site.business.email}<p><a href={`mailto:${site.business.email}`}>{site.business.email}</a></p>{/if}
  {#if site.business.serviceArea}<p>{site.business.serviceArea}</p>{/if}
</footer>
