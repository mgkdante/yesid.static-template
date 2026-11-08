import { z } from 'zod';
import { parse } from 'yaml';
import { contractFields, type CmsField } from '@yesid/content-contract';

export interface Entry<Name extends string = string, Content = unknown> {
  readonly id: string;
  readonly collection: Name;
  readonly language: string;
  readonly slug: string;
  /** True when the address comes from the file name; false when a collection's `slug` callback derives it from content. */
  readonly fromFileName: boolean;
  readonly metadata: { readonly title: string; readonly description: string; readonly image?: string };
  readonly content: Content;
  readonly shared: unknown;
}
export interface CollectionDefinition<E extends Entry = Entry> {
  readonly name: string;
  readonly listing: string;
  /** `identifierField` names the field the editor makes a new entry's file name from, once, when it is first saved. */
  readonly cms: { name: string; label: string; folder: string; contract: z.ZodObject; identifierField?: string };
  readonly parse: (file: string, source: string, languages: readonly string[]) => E;
}

const hasShared = (value: unknown): boolean => Array.isArray(value) ? value.some(hasShared) : value !== undefined;

function sharedField(field: CmsField, value: unknown): unknown {
  if (field.i18n === 'duplicate') return value;
  const children = Array.isArray(field.fields) ? field.fields as CmsField[] : undefined;
  if (Array.isArray(value)) {
    if (children) return value.map((item) => sharedContent(item, children));
    if (field.field && typeof field.field === 'object') {
      return value.map((item) => sharedField(field.field as CmsField, item));
    }
  }
  return children ? sharedContent((value ?? {}) as Record<string, unknown>, children) : undefined;
}

function sharedContent(data: Record<string, unknown>, fields: readonly CmsField[]): unknown {
  const shared = fields.flatMap((field) => {
    const value = sharedField(field, data[field.name]);
    return hasShared(value) ? [[field.name, value]] : [];
  });
  return shared.length ? Object.fromEntries(shared) : undefined;
}

function readDocument(file: string, source: string, languages: readonly string[]) {
  const identity = /(?:^|\/)([^/]+)\.([^.]+)\.md$/.exec(file);
  const document = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(source);
  if (!identity || !document || !languages.includes(identity[2])) throw new Error(`Invalid collection file: ${file}`);
  const front: unknown = parse(document[1]);
  if (!front || typeof front !== 'object' || Array.isArray(front)) throw new Error(`Invalid frontmatter: ${file}`);
  return { key: identity[1], language: identity[2], front, body: document[2].trim() };
}

/** An address becomes a folder name, so every address segment stays within this many bytes. */
export const MAX_SLUG_BYTES = 80;
export const byteLength = (text: string) => new TextEncoder().encode(text).length;
export function shorten(slug: string, maxBytes = MAX_SLUG_BYTES): string {
  const chars = Array.from(slug);
  let length = chars.length;
  while (byteLength(chars.slice(0, length).join('')) > maxBytes) length -= 1;
  return chars.slice(0, length).join('').replace(/-+$/, '');
}

export function entrySlug(text: string, key: string): string {
  const slug = text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return shorten(slug || `entry-${Array.from(key).map((char) => char.codePointAt(0)!.toString(16)).join('-')}`);
}

export function defineCollection<const Name extends string, Contract extends z.ZodObject, Content>(input: {
  name: Name;
  label: string;
  listing: string;
  contract: Contract;
  metadata: (data: z.infer<Contract>) => Entry['metadata'];
  present: (data: z.infer<Contract>) => Content;
  /** The field a new entry's file name, and so its address, is made from. Required when the contract has no `title`. */
  identifierField?: Extract<keyof z.infer<Contract>, string>;
  slug?: (data: z.infer<Contract>, key: string) => string;
}): CollectionDefinition<Entry<Name, Content>> & { readonly name: Name } {
  if (!/^[a-z][a-z0-9-]*$/.test(input.name)) throw new Error(`Invalid collection name: ${input.name}`);
  // Without one, the editor names new files with a random code, and that code becomes the public address.
  if (!input.identifierField && !('title' in input.contract.shape)) {
    throw new Error(`Collection ${input.name} needs identifierField: its contract has no title field`);
  }
  if (input.identifierField && !(input.identifierField in input.contract.shape)) {
    throw new Error(`Collection ${input.name}: identifierField ${input.identifierField} is not in its contract`);
  }
  const fields = contractFields(input.contract);
  return {
    name: input.name, listing: input.listing,
    cms: {
      name: input.name, label: input.label, folder: `src/lib/content/${input.name}`, contract: input.contract,
      ...(input.identifierField ? { identifierField: input.identifierField } : {})
    },
    parse(file, source, languages) {
      const document = readDocument(file, source, languages);
      const body = (document.body || 'body' in input.contract.shape) ? { body: document.body } : {};
      const data = input.contract.parse({ ...document.front, ...body });
      const metadata = input.metadata(data);
      if (!metadata.title.trim() || !metadata.description.trim()) throw new Error(`Missing page metadata: ${file}`);
      return {
        id: `${input.name}:${document.key}`, collection: input.name, language: document.language,
        // The file name is set once, when the entry is first saved, so editing a title never moves the address.
        // A callback's text is normalized like a file name, so Owner wording can't produce an invalid or over-long address.
        slug: entrySlug(input.slug?.(data, document.key) ?? document.key, document.key),
        fromFileName: !input.slug,
        metadata, content: input.present(data), shared: sharedContent(data, fields)
      };
    }
  };
}

export function loadCollections<const Definitions extends readonly CollectionDefinition[]>(
  definitions: Definitions, sources: Readonly<Record<string, string>>, languages: readonly string[]
): ReturnType<Definitions[number]['parse']>[] {
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  if (byName.size !== definitions.length) throw new Error('Duplicate collection name');
  const entries = Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)).map(([file, source]) => {
    const folder = /^\.\/([^/]+)\/[^/]+\.md$/.exec(file)?.[1];
    const definition = folder ? byName.get(folder) : undefined;
    if (!definition) throw new Error(`Unregistered collection file: ${file}`);
    return definition.parse(file, source, languages);
  });
  const identities = entries.map((entry) => `${entry.id}/${entry.language}`);
  if (new Set(identities).size !== entries.length) throw new Error('Duplicate collection translation');
  for (const entry of entries) {
    const variants = entries.filter(({ id }) => id === entry.id);
    if (variants.some((variant) => JSON.stringify(variant.shared) !== JSON.stringify(entry.shared))) {
      throw new Error(`Shared fields differ: ${entry.id}`);
    }
  }
  // Each parse result is one member of the supplied definitions' return union.
  return entries as ReturnType<Definitions[number]['parse']>[];
}
