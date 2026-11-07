interface PrerenderError {
  readonly status: number;
  readonly message: string;
}

/**
 * A link or photo an Owner added can go missing. That is their content, so it warns instead of stopping
 * every later save from publishing. A test still checks the links the site's own code writes.
 */
export function handleMissingFile({ status, message }: PrerenderError): void {
  if (status !== 404) throw new Error(message);
  console.warn(message);
}

export const prerenderPolicy = { handleHttpError: handleMissingFile, handleMissingId: 'warn' } as const;
