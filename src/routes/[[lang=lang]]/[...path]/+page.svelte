<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Header from '#lib/sections/Header.svelte';
  import Page from '#lib/sections/Page.svelte';
  import Footer from '#lib/sections/Footer.svelte';
  let { data } = $props();
</script>
<Seo title={data.page.title} description={data.page.description} canonical={data.row.url} alternates={data.alternates} />
<Header text={data.text} navigation={data.navigation} alternates={data.alternates} />
<Page page={data.page} html={data.html} posts={data.posts} />
<Footer />
