export function genDBplaceHolder(input: unknown) {
  if (Array.isArray(input)) {
    return input.map(() => "?").join(",");
  }
  if (input && typeof input === "object") {
    return Object.keys(input)
      .map(() => "?")
      .join(",");
  }
}
