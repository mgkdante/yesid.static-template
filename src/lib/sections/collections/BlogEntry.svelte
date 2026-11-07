<script lang="ts">
  import type { SiteEntry } from '#lib/content/registry.ts';
  let { entry }: { entry: SiteEntry } = $props();
</script>
{#if entry.collection === 'posts'}
  <main id="main">
    <h1>{entry.content.title}</h1>
    <p><time datetime={entry.content.date}>{entry.content.date}</time></p>
    {#if entry.content.photo}<img src={entry.content.photo} alt={entry.content.photoAlt} />{/if}
    <article>{@html entry.content.html}</article>
  </main>
{/if}
