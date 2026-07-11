// Webpack CSS import
import 'onsenui/css/onsenui.css'
import 'onsenui/css/onsen-css-components.css'

// JS import
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import VueOnsen from 'vue-onsenui' // This imports 'onsenui', so no need to import it separately
import App from './App.vue'
import en from './i18n/en/en'
import it from './i18n/it/it'
import de from './i18n/de/de'
import se from './i18n/se/se'
import dz from './i18n/dz/dz'

import storage from './modules/storage'

Vue.use(VueOnsen) // VueOnsen set here as plugin to VUE. Done automatically if a call to window.Vue exists in the startup code.
Vue.use(VueI18n) // this is used for ii18n

const messages = {
  en: en,
  it: it,
  de: de,
  se: se,
  dz: dz
}


let start = async function () {
  console.log('TimedWalkApp starting')

  // got locale from storage or browser
  let locale = await storage.getItem('locale')
  if (!locale) {
    locale = navigator.language.split('-')[0]
  }
  console.log('Locale: ' + locale)

  // Create VueI18n instance with options
  const i18n = new VueI18n({
    locale: locale,
    fallbackLocale: 'en',
    messages // set locale messages
  })

  new Vue({
    i18n,
    render: h => h(App)
  }).$mount('#app')
}



if (process.env.NODE_ENV === 'production') {

  // load cordova
  let cordovaScript = document.createElement('script')
  cordovaScript.setAttribute('src', 'cordova.js')
  document.head.appendChild(cordovaScript)

  // wait for cordova device ready
  document.addEventListener('deviceready', start, false)
} else {
  start()
}
