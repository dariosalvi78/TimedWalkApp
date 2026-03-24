/**
 * resolve-extensions.mjs
 *
 * Node.js ESM custom loader that:
 * 1. Appends `.js` to bare relative specifiers (e.g. './signalCheck' → './signalCheck.js')
 * 2. Injects `{ type: 'json' }` assertion for .json imports so Node accepts them
 *    without modifying source files that use bundler-style bare JSON imports.
 *
 * Usage:
 *   node --loader ./resolve-extensions.mjs public/eval_distance.mjs
 *   node --loader ./resolve-extensions.mjs public/eval_curvature.mjs
 */

import { fileURLToPath, pathToFileURL } from 'url'
import { resolve as resolvePath }       from 'path'
import fs                               from 'fs'

export async function resolve(specifier, context, nextResolve) {
  // ── 1. Bare relative specifier with no extension → try appending .js ───────
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.\w+$/.test(specifier) &&
    context.parentURL
  ) {
    const parentDir = fileURLToPath(new URL('.', context.parentURL))
    const candidate = resolvePath(parentDir, specifier + '.js')
    if (fs.existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context)
    }
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  // ── 2. Inject json type assertion for .json files ──────────────────────────
  if (url.endsWith('.json')) {
    return nextLoad(url, { ...context, importAttributes: { type: 'json' } })
  }

  return nextLoad(url, context)
}
