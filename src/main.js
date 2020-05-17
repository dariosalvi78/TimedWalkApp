// Webpack CSS import
import 'onsenui/css/onsenui.css'
import 'onsenui/css/onsen-css-components.css'

// JS import
import Vue from 'vue'
import VueOnsen from 'vue-onsenui' // This imports 'onsenui', so no need to import it separately
import App from './App.vue'

Vue.use(VueOnsen); // VueOnsen set here as plugin to VUE. Done automatically if a call to window.Vue exists in the startup code.


Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
