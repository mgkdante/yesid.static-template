<script lang="ts">
  let { page, html, posts }: { page: { title: string; body: string; date?: string; photo?: string; photoAlt?: string }; html?: string; posts: { path: string; title: string; date: string }[] } = $props();
</script>
<main id="main">
  <h1>{page.title}</h1>
  {#if page.date}<p><time datetime={page.date}>{page.date}</time></p>{/if}
  {#if page.photo}<img src={page.photo} alt={page.photoAlt ?? ''} />{/if}
  {#if html}<article>{@html html}</article>{:else}<p>{page.body}</p>{/if}
  {#if posts.length}<ul>{#each posts as post (post.path)}<li><a href={post.path}>{post.title}</a> <time datetime={post.date}>{post.date}</time></li>{/each}</ul>{/if}
</main>
