import { marked } from 'marked';
import sanitize from 'sanitize-html';

export function renderMarkdown(source: string): string {
  return sanitize(marked.parse(source, { async: false }), {
    allowedTags: ['p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false
  });
}
