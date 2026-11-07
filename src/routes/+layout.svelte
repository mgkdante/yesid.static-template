<script lang="ts">
  import { site } from '#lib/config/site.ts';
  let { children } = $props();
</script>
<svelte:head>
  {#each site.icons ?? [] as icon (icon.href)}<link rel={icon.rel} href={icon.href} type={icon.type} sizes={icon.sizes} />{/each}
</svelte:head>
{@render children()}
