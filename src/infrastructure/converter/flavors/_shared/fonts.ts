// Font asset loading - will be populated with font buffers
export interface Font {
  name: string;
  data: Buffer;
  weight?: number;
  style?: "normal" | "italic";
}

let fonts: Font[] = [];

export function setFonts(newFonts: Font[]): void {
  fonts = newFonts;
}

export function getFonts(): readonly Font[] {
  return fonts;
}
