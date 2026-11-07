import { defineParams } from '@sveltejs/kit/params';
import { site } from './lib/config/site.ts';
export const params = defineParams({
  lang: (value) => site.languages.some(({ code }) => code !== site.defaultLanguage && code === value) ? value : undefined
});
