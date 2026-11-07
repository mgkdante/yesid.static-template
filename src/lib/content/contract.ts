import { z } from 'zod';
import { date, group, image, line, paragraph, richText } from '@yesid/content-contract';

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
export const pagesContract = z.strictObject({
  home: group('Accueil', pageFields),
  about: group('Page fixe', pageFields),
  legal: group('Mentions légales', pageFields),
  blog: group('Blog', pageFields)
});
export const postContract = z.strictObject({
  title: line('Titre'),
  description: paragraph('Description pour les moteurs de recherche'),
  date: date('Date', { shared: true }),
  photo: image('Photo', { optional: true, shared: true }),
  photoAlt: paragraph('Description de la photo'),
  body: richText('Texte')
});
export type SiteText = z.infer<typeof siteTextContract>;
export type Pages = z.infer<typeof pagesContract>;
export type PostContent = z.infer<typeof postContract>;
export type FixedPageId = keyof Pages;
