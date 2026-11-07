import { z } from 'zod';
import { date, image, line, list, optionalParagraph, paragraph, richText } from '@yesid/content-contract';

const pageFields = {
  title: line('Titre'),
  description: paragraph('Description pour les moteurs de recherche'),
  body: paragraph('Texte')
};
export const menuContract = z.strictObject({
  skip: line('Aller au contenu'),
  navigation: line('Nom du menu'),
  languages: line('Nom du choix de langue')
});
export const footerContract = z.strictObject({ note: line('Mention') });
export const errorContract = z.strictObject({
  title: line('Titre'),
  description: paragraph('Description'),
  home: line('Lien vers l’accueil')
});
export const pageContract = z.strictObject(pageFields);
export const fixedPageIds = ['home', 'about', 'blog', 'projects', 'privacy', 'terms'] as const;
export const postContract = z.strictObject({
  title: line('Titre'),
  description: paragraph('Description pour les moteurs de recherche'),
  date: date('Date', { shared: true }),
  photo: image('Photo', { optional: true, shared: true }),
  photoAlt: optionalParagraph('Description de la photo'),
  body: richText('Texte')
});
export const projectContract = z.strictObject({
  name: line('Nom du projet'),
  summary: paragraph('Résumé'),
  services: list('Services', line('Service')),
  body: richText('Présentation du projet')
});
export type MenuText = z.infer<typeof menuContract>;
export type FooterText = z.infer<typeof footerContract>;
export type ErrorText = z.infer<typeof errorContract>;
export type FixedPageId = (typeof fixedPageIds)[number];
export type Pages = Record<FixedPageId, z.infer<typeof pageContract>>;
export type PostContent = z.infer<typeof postContract>;
