<script lang="ts">
  import type { ListingProps } from './types.ts';
  let { page, items }: ListingProps = $props();
</script>
<main id="main">
  <h1>{page.title}</h1><p>{page.body}</p>
  <ul>{#each items as item (item.path)}
    {#if item.entry.collection === 'projects'}<li><a href={item.path}>{item.entry.content.name}</a><p>{item.entry.content.summary}</p></li>{/if}
  {/each}</ul>
</main>
