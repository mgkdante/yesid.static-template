<script lang="ts">
  import { site } from '#lib/config/site.ts';
  import type { MenuText } from '#lib/content/contract.ts';
  let { text, navigation, alternates }: { text: MenuText; navigation: { path: string; title: string }[]; alternates: { language: string; path: string }[] } = $props();
</script>
<a href="#main">{text.skip}</a>
<header>
  <p>{site.business.name}</p>
  <nav aria-label={text.navigation}><ul>{#each navigation as item (item.path)}<li><a href={item.path}>{item.title}</a></li>{/each}</ul></nav>
  <nav aria-label={text.languages}><ul>{#each alternates as item (item.language)}<li><a href={item.path} hreflang={item.language} lang={item.language}>{site.languages.find(({ code }) => code === item.language)?.label}</a></li>{/each}</ul></nav>
</header>
