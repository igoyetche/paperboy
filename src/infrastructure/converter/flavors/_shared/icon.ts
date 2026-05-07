// Icon asset loading - will be populated with data URI from cover-icon.png
export let iconDataUri: string | undefined;

export function setIconDataUri(uri: string): void {
  iconDataUri = uri;
}

export function getIconDataUri(): string | undefined {
  return iconDataUri;
}
