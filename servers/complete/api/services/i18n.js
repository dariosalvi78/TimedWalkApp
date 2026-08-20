import entext from '../i18n/en/en.js'

// extracts a property using a string, see https://stackoverflow.com/a/6491621/1097607
let byString = function (o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
}


export const ACCEPTED_LANGUAGES = ['en']
export const DEFAULT_LANGUAGE = 'en'


/**
 * I18n class for handling internationalization.
 * API inspired by https://vue-i18n.intlify.dev/ but without singleton to avoid global state conflicts.
 *
 * Usage with browser request:
 * ```
 * let lang = req.acceptsLanguages(ACCEPTED_LANGUAGES)
 * let i18n = new I18n(lang)
 * let text = i18n.t('some.text.id', { token1: 'value1', token2: 'value2' })
 * ```
 */
export class I18n {
  constructor(locale) {
    if (!locale || !ACCEPTED_LANGUAGES.includes(locale.toLowerCase())) {
      this.locale = DEFAULT_LANGUAGE
    } else {
      this.locale = locale.toLowerCase()
    }
    this.text = {
      en: entext
    }
  }
  /**
   * Translates a text ID into the corresponding text in the current locale, replacing tokens with provided arguments.
   * @param {string} id - the text ID to translate
   * @param {Object} args - an object containing token-value pairs for replacement in the translated text
   * @returns {string|undefined} - the translated text with tokens replaced, or undefined if the text ID is not found
   */
  t (id, args) {
    let text = byString(this.text[this.locale], id)
    if (!text) return undefined
    for (const token in args) {
      let regex = new RegExp('{\\s*' + token + '\\s*}', 'g')
      text = text.replace(regex, args[token])
    }
    return text
  }
}
