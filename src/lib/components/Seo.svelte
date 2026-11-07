<script lang="ts">
  import { businessJsonLd, safeJson } from '#lib/seo.ts';
  import { site } from '#lib/config/site.ts';
  let { title, description, canonical, alternates = [], noindex = false }:
    { title: string; description: string; canonical: string; alternates?: { language: string; url: string }[]; noindex?: boolean } = $props();
</script>
<svelte:head>
  <title>{title} | {site.business.name}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={site.business.name} />
  {#if noindex}<meta name="robots" content="noindex" />{/if}
  {#each alternates as alternate (alternate.language)}
    <link rel="alternate" hreflang={alternate.language} href={alternate.url} />
  {/each}
  {@html `<script type="application/ld+json">${safeJson(businessJsonLd(site.business))}</script>`}
</svelte:head>
