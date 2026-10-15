import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseSync } from 'vite';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');
const DATA = resolve(SRC, '..', 'data');

const NOT_YET_MOVED = [
  'screens/Dashboard.tsx',
  'screens/Account.tsx',
  'screens/SafetyLab.tsx',
  'screens/onboarding/',
  'components/BottomNav.tsx',
  'components/HelpNow.tsx',
];

const COPY_PROPS = new Set([
  'placeholder',
  'aria-label',
  'aria-description',
  'title',
  'alt',
  'label',
  'message',
  'cta',
]);

const LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

type Node = { type: string; [key: string]: unknown };

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function renderedStrings(expression: unknown): string[] {
  if (!isNode(expression)) return [];
  switch (expression.type) {
    case 'Literal':
      return typeof expression['value'] === 'string' ? [expression['value']] : [];
    case 'TemplateLiteral':
      return (expression['quasis'] as Node[]).map((q) => String((q['value'] as { cooked: string }).cooked));
    case 'ConditionalExpression':
      return [...renderedStrings(expression['consequent']), ...renderedStrings(expression['alternate'])];
    case 'LogicalExpression':
      return expression['operator'] === '&&'
        ? renderedStrings(expression['right'])
        : [...renderedStrings(expression['left']), ...renderedStrings(expression['right'])];
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
      return renderedStrings(expression['expression']);
    default:
      return [];
  }
}

export function copyInComponent(fileName: string, source: string): string[] {
  const found: string[] = [];
  const { program, errors } = parseSync(fileName, source);
  if (errors.length > 0) throw new Error(`${fileName} did not parse`);

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isNode(node)) return;

    if (node.type === 'JSXText' && LETTER.test(String(node['value']))) {
      found.push(String(node['value']).trim());
    }

    if (node.type === 'JSXAttribute') {
      const name = (node['name'] as Node)['name'];
      const value = node['value'];
      if (typeof name === 'string' && COPY_PROPS.has(name) && isNode(value)) {
        const strings =
          value.type === 'JSXExpressionContainer' ? renderedStrings(value['expression']) : renderedStrings(value);
        found.push(...strings.filter((s) => LETTER.test(s)));
      }
    }

    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      for (const child of node['children'] as Node[]) {
        if (child.type === 'JSXExpressionContainer') {
          found.push(...renderedStrings(child['expression']).filter((s) => LETTER.test(s)));
        }
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key !== 'type' && key !== 'start' && key !== 'end') visit(value);
    }
  };

  visit(program);
  return found;
}

function componentFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) out.push(full);
    }
  };
  walk(join(SRC, 'screens'));
  walk(join(SRC, 'components'));
  return out.filter((file) => !NOT_YET_MOVED.some((skip) => relative(SRC, file).startsWith(skip)));
}

const VOSEO = [
  'podés',
  'querés',
  'tenés',
  'sabés',
  'elegí',
  'escribí',
  'mostrame',
  'contanos',
  'probá',
  'entrá',
  'sentís',
  'decís',
  'vos',
  'sos',
  'contá',
  'mirá',
  'fijate',
  'llamá',
  'revisá',
  'avisalo',
  'generalo',
  'cargalos',
  'escribinos',
];

function voseoIn(text: string): string[] {
  return VOSEO.filter((form) => new RegExp(`(?<!\\p{L})${form}(?!\\p{L})`, 'iu').test(text));
}

describe('copy lives in the language file', () => {
  it('finds the components', () => {
    expect(componentFiles().length).toBeGreaterThan(20);
  });

  it('catches copy written inside a component', () => {
    const planted = `
      export function Planted({ done }: { done: boolean }) {
        return (
          <div>
            <p>Hola, te damos la bienvenida</p>
            <input placeholder="Escribe aquí" aria-label={'Tu mensaje'} />
            <button>{done ? 'Hecho hoy' : 'Marcar hoy'}</button>
            <span>{copy.ok} →</span>
          </div>
        );
      }`;
    expect(copyInComponent('Planted.tsx', planted)).toEqual([
      'Hola, te damos la bienvenida',
      'Escribe aquí',
      'Tu mensaje',
      'Hecho hoy',
      'Marcar hoy',
    ]);
  });

  it('leaves no copy in the screens and components', () => {
    const offenders = componentFiles().flatMap((file) =>
      copyInComponent(file, readFileSync(file, 'utf8')).map((text) => `${relative(SRC, file)}: ${text}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe('the copy is neutral Spanish', () => {
  it('catches a voseo form', () => {
    expect(voseoIn('Contanos qué querés probar.')).toEqual(['querés', 'contanos']);
    expect(voseoIn('Cuéntanos qué quieres probar; la voz sale sola.')).toEqual([]);
  });

  it('has no voseo in es.ts', () => {
    expect(voseoIn(readFileSync(join(SRC, 'i18n', 'es.ts'), 'utf8'))).toEqual([]);
  });

  it('has no voseo in the user-facing data', () => {
    const files = readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'crisis-keywords.json');
    const offenders = files.flatMap((file) =>
      voseoIn(readFileSync(join(DATA, file), 'utf8')).map((form) => `${file}: ${form}`),
    );
    expect(offenders).toEqual([]);
  });
});
