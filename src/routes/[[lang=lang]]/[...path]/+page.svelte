<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Header from '#lib/sections/Header.svelte';
  import Page from '#lib/sections/Page.svelte';
  import { collectionViews } from '#lib/sections/collections/index.ts';
  import Footer from '#lib/sections/Footer.svelte';
  let { data } = $props();
</script>
<Seo title={data.page.title} description={data.page.description} canonical={data.row.url} alternates={data.alternates} />
<Header text={data.text} navigation={data.navigation} alternates={data.alternates} />
{#if data.entry}
  {@const Detail = collectionViews[data.entry.collection].detail}
  <Detail entry={data.entry} />
{:else if data.listing}
  {@const Listing = collectionViews[data.listing.collection].listing}
  <Listing page={data.page} items={data.items} />
{:else}
  <Page page={data.page} />
{/if}
<Footer />
