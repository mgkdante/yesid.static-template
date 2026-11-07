import { Marked } from 'marked';
import sanitize from 'sanitize-html';

const markdown = new Marked({ renderer: { html: () => '' } });

/** The build follows every link, and stops on one it can't read. */
function readable(url: string): boolean {
  try {
    const { pathname, hash } = new URL(url, 'https://site.invalid');
    // The results are used on purpose: the production bundler removes these calls if they aren't, and nothing throws.
    return decodeURI(pathname).length + decodeURIComponent(hash).length > 0;
  } catch {
    return false;
  }
}
/** A link an Owner types can be malformed. It keeps its text and loses the address. */
const dropUnreadable = (attribute: string): sanitize.Transformer => (tagName, attribs) => ({
  tagName,
  attribs: Object.fromEntries(Object.entries(attribs).filter(([name, value]) => name !== attribute || readable(value)))
});

export function renderMarkdown(source: string): string {
  return sanitize(markdown.parse(source, { async: false }), {
    allowedTags: ['p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: { a: dropUnreadable('href'), img: dropUnreadable('src') }
  });
}
