<script lang="ts">
  import { loginUrl, site } from '#lib/config/site.ts';
</script>
<svelte:head>
  <title>{site.business.name}</title>
  <meta name="robots" content="noindex" />
  <meta http-equiv="refresh" content={`0;url=${loginUrl}`} />
</svelte:head>
<main><a href={loginUrl}>{loginUrl}</a></main>
