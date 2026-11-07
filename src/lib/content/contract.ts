import { z } from 'zod';
import { date, group, image, line, list, paragraph, richText } from '@yesid/content-contract';

const pageFields = {
  title: line('Titre'),
  description: paragraph('Description pour les moteurs de recherche'),
  body: paragraph('Texte')
};
export const siteTextContract = z.strictObject({
  skip: line('Aller au contenu'),
  navigation: line('Navigation'),
  languages: line('Langues'),
  error: group('Page introuvable', { title: line('Titre'), description: paragraph('Description'), home: line('Retour') }),
  admin: group('Connexion', { title: line('Titre'), description: paragraph('Description'), link: line('Lien') })
});
export const pageContract = z.strictObject(pageFields);
export const fixedPageIds = ['home', 'about', 'blog', 'projects', 'legal'] as const;
export const postContract = z.strictObject({
  title: line('Titre'),
  description: paragraph('Description pour les moteurs de recherche'),
  date: date('Date', { shared: true }),
  photo: image('Photo', { optional: true, shared: true }),
  photoAlt: paragraph('Description de la photo'),
  body: richText('Texte')
});
export const projectContract = z.strictObject({
  name: line('Nom du projet'),
  summary: paragraph('Résumé'),
  services: list('Services', line('Service')),
  body: richText('Présentation du projet')
});
export type SiteText = z.infer<typeof siteTextContract>;
export type FixedPageId = (typeof fixedPageIds)[number];
export type Pages = Record<FixedPageId, z.infer<typeof pageContract>>;
export type PostContent = z.infer<typeof postContract>;
