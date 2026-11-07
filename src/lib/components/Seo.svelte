<script lang="ts">
  import { businessJsonLd, pageSeo, safeJson } from '#lib/seo.ts';
  import { site } from '#lib/config/site.ts';
  import { content } from '#lib/content/index.ts';
  let { title, description, canonical = undefined, language, alternates = [], image = undefined, noindex = false }:
    { title: string; description: string; canonical?: string; language: string; alternates?: { language: string; url: string }[]; image?: string; noindex?: boolean } = $props();
  const seo = $derived(pageSeo({ language, alternates, image }, site));
  const business = $derived(businessJsonLd(site.business, {
    url: new URL(site.origin).href,
    description: content[language].pages.home.description,
    image: seo.image?.url
  }));
</script>
<svelte:head>
  <title>{title} | {site.business.name}</title>
  <meta name="description" content={description} />
  {#if noindex}
    <meta name="robots" content="noindex" />
  {:else}
    {#if canonical}<link rel="canonical" href={canonical} />{/if}
    {#each alternates as alternate (alternate.language)}
      <link rel="alternate" hreflang={alternate.language} href={alternate.url} />
    {/each}
    {#if seo.xDefault}<link rel="alternate" hreflang="x-default" href={seo.xDefault} />{/if}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    {#if canonical}<meta property="og:url" content={canonical} />{/if}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={site.business.name} />
    {#if seo.ogLocale}<meta property="og:locale" content={seo.ogLocale} />{/if}
    {#each seo.ogLocaleAlternates as locale (locale)}<meta property="og:locale:alternate" content={locale} />{/each}
    {#if seo.image}
      <meta property="og:image" content={seo.image.url} />
      {#if seo.image.width}<meta property="og:image:width" content={String(seo.image.width)} />{/if}
      {#if seo.image.height}<meta property="og:image:height" content={String(seo.image.height)} />{/if}
      <meta property="og:image:alt" content={title} />
      <meta name="twitter:image" content={seo.image.url} />
    {/if}
    <meta name="twitter:card" content={seo.image ? 'summary_large_image' : 'summary'} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    {@html `<script type="application/ld+json">${safeJson(business)}</script>`}
  {/if}
</svelte:head>
