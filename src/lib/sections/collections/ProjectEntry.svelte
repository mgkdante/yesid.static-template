<script lang="ts">
  import type { SiteEntry } from '#lib/content/registry.ts';
  let { entry }: { entry: SiteEntry } = $props();
</script>
{#if entry.collection === 'projects'}
  <main id="main">
    <h1>{entry.content.name}</h1>
    <p>{entry.content.summary}</p>
    <ul>{#each entry.content.services as service, index (index)}<li>{service}</li>{/each}</ul>
    <article>{@html entry.content.html}</article>
  </main>
{/if}
