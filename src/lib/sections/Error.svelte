<script lang="ts">
  import type { ErrorText } from '#lib/content/contract.ts';
  let { text, home }: { text: ErrorText; home: string } = $props();
</script>
<article><h1>{text.title}</h1><p>{text.description}</p><a href={home}>{text.home}</a></article>
