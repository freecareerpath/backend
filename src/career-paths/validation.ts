import { BadRequestException } from '@nestjs/common';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function requireNonEmptyString(
  value: unknown,
  field: string,
  maxLength = 500,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required.`);
  }
  if (value.length > maxLength) {
    throw new BadRequestException(
      `${field} must be ${maxLength} characters or fewer.`,
    );
  }
  return value;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength = 20000,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new BadRequestException(
      `${field} must be ${maxLength} characters or fewer.`,
    );
  }
  return value;
}

export function requireSlug(value: unknown, field = 'slug'): string {
  const str = requireNonEmptyString(value, field, 200);
  if (!SLUG_PATTERN.test(str)) {
    throw new BadRequestException(
      `${field} must be lowercase letters, numbers, and hyphens only (e.g. "coding-with-ai").`,
    );
  }
  return str;
}

export function optionalSlug(
  value: unknown,
  field = 'slug',
): string | undefined {
  if (value === undefined) return undefined;
  return requireSlug(value, field);
}

export function requireStatus(
  value: unknown,
  field = 'status',
): 'draft' | 'published' {
  if (value !== 'draft' && value !== 'published') {
    throw new BadRequestException(`${field} must be "draft" or "published".`);
  }
  return value;
}

export function optionalStatus(
  value: unknown,
  field = 'status',
): 'draft' | 'published' | undefined {
  if (value === undefined) return undefined;
  return requireStatus(value, field);
}

export function optionalNonNegativeInt(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new BadRequestException(`${field} must be a non-negative integer.`);
  }
  return n;
}

export function requireUrl(value: unknown, field = 'url'): string {
  const str = requireNonEmptyString(value, field, 2000);
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new BadRequestException(`${field} must be a valid http(s) URL.`);
  }
  return str;
}

export function requireOrderedIdArray(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.some((v) => typeof v !== 'string' || v.length === 0)
  ) {
    throw new BadRequestException(
      'orderedIds must be a non-empty array of string ids.',
    );
  }
  return value as string[];
}
