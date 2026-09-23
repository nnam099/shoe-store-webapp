export function normalizeSearchText(value) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function createSlugBase(name) {
  const slug = normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "san-pham";
}

export function createSlugCandidate(base, attempt = 1) {
  return attempt === 1 ? base : `${base}-${attempt}`;
}
