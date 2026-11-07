<script lang="ts">
  import { loginUrl, site } from '#lib/config/site.ts';
  import { content } from '#lib/content/index.ts';
  import Seo from '#lib/components/Seo.svelte';
  const text = content[site.defaultLanguage].text.admin;
</script>
<Seo title={text.title} description={text.description} canonical={`${site.origin}/admin/`} noindex />
<svelte:head><meta http-equiv="refresh" content={`0;url=${loginUrl}`} /></svelte:head>
<main><h1>{text.title}</h1><p>{text.description}</p><a href={loginUrl}>{text.link}</a></main>
