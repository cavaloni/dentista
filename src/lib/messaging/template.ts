const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function renderTemplate(
  template: string,
  context: Record<string, string | number>
) {
  return template.replace(PLACEHOLDER_REGEX, (match, key) => {
    const value = context[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}
