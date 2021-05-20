// Webpack CSS import
import 'onsenui/css/onsenui.css'
import 'onsenui/css/onsen-css-components.css'

// JS import
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import VueOnsen from 'vue-onsenui' // This imports 'onsenui', so no need to import it separately
import App from './App.vue'
import en from './i18n/en/en'

Vue.use(VueOnsen) // VueOnsen set here as plugin to VUE. Done automatically if a call to window.Vue exists in the startup code.
Vue.use(VueI18n) // this is used for ii18n

const messages = {
  en: en
}

// Create VueI18n instance with options
const i18n = new VueI18n({
  locale: navigator.language.split('-')[0],
  fallbackLocale: 'en',
  messages // set locale messages
})

Vue.config.productionTip = false

let start = function () {
  new Vue({
    i18n,
    render: h => h(App)
  }).$mount('#app')
}

if (process.env.NODE_ENV === 'production') {
  // wait for cordova device ready
  document.addEventListener('deviceready', start, false)
} else {
  start()
}
