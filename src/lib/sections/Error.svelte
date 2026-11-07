<script lang="ts">
  import type { SiteText } from '#lib/content/contract.ts';
  let { text, home }: { text: SiteText['error']; home: string } = $props();
</script>
<main id="main"><h1>{text.title}</h1><p>{text.description}</p><a href={home}>{text.home}</a></main>
