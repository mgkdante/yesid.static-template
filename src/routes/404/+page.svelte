<script lang="ts">
  import { site } from '#lib/config/site.ts';
  import { content, siteMap } from '#lib/content/index.ts';
  import ErrorSection from '#lib/sections/Error.svelte';
  import Seo from '#lib/components/Seo.svelte';
</script>
<Seo title={content[site.defaultLanguage].text.error.title} description={content[site.defaultLanguage].text.error.description} canonical={`${site.origin}/404.html`} noindex />
{#each site.languages as language (language.code)}
  <section lang={language.code}>
    <ErrorSection text={content[language.code].text.error} home={siteMap.path('home', language.code)!} />
  </section>
{/each}
