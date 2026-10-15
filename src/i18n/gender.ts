export type GrammaticalGender = 'femenino' | 'masculino' | 'neutro';

export type Gendered = Record<GrammaticalGender, string>;

export function byGender(text: Gendered, gender: GrammaticalGender): string {
  return text[gender];
}
