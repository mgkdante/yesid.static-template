<script lang="ts">
  let { page }: { page: { title: string; body?: string } } = $props();
</script>
<main id="main"><h1>{page.title}</h1><p>{page.body}</p></main>
