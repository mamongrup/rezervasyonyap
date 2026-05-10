/** Page builder persisted JSON için şema sürümü (migrasyon / normalize). */
export const PAGE_BUILDER_SCHEMA_VERSION = 1 as const

/** Tek sayfaya en fazla modül — aşırı büyük JSON / admin performansına sınır. */
export const MAX_PAGE_BUILDER_MODULES = 120

/** POST gövdesi üst limiti (byte). */
export const MAX_PAGE_BUILDER_BODY_BYTES = 900_000
