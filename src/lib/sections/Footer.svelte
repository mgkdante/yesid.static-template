<script lang="ts">
  import { site } from '#lib/config/site.ts';
  import type { FooterText } from '#lib/content/contract.ts';
  let { text, links }: { text: FooterText; links: { path: string; title: string }[] } = $props();
</script>
<footer>
  <p>{site.business.name}</p>
  {#if site.business.phone}<p><a href={`tel:${site.business.phone}`}>{site.business.phone}</a></p>{/if}
  {#if site.business.email}<p><a href={`mailto:${site.business.email}`}>{site.business.email}</a></p>{/if}
  {#if site.business.serviceArea}<p>{site.business.serviceArea}</p>{/if}
  <ul>{#each links as link (link.path)}<li><a href={link.path}>{link.title}</a></li>{/each}</ul>
  <p>{text.note}</p>
</footer>
