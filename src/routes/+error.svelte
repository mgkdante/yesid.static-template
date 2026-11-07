<script lang="ts">
  import { page } from '$app/state';
  import { languageFromPath } from '#lib/config/site.ts';
  import { content, siteMap } from '#lib/content/index.ts';
  import ErrorSection from '#lib/sections/Error.svelte';
  let language = $derived(languageFromPath(page.url.pathname));
</script>
<svelte:head><meta name="robots" content="noindex" /><title>{content[language].error.title}</title></svelte:head>
<main id="main"><ErrorSection text={content[language].error} home={siteMap.path('home', language)!} /></main>
