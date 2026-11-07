<script lang="ts">
  import type { ListingProps } from './types.ts';
  let { page, items }: ListingProps = $props();
  let ordered = $derived([...items].sort((a, b) => a.entry.collection === 'posts' && b.entry.collection === 'posts'
    ? b.entry.content.date.localeCompare(a.entry.content.date) : 0));
</script>
<main id="main">
  <h1>{page.title}</h1><p>{page.body}</p>
  <ul>{#each ordered as item (item.path)}
    {#if item.entry.collection === 'posts'}<li><a href={item.path}>{item.entry.content.title}</a> <time datetime={item.entry.content.date}>{item.entry.content.date}</time></li>{/if}
  {/each}</ul>
</main>
