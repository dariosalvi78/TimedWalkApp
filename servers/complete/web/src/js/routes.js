
import LoginPage from '../components/loginPage.vue';
import NotFoundPage from '../pages/404.vue';
import newAccountPage from '../components/clinician/newAccountPage.vue';

import userInfo from '../js/userInfo.js';


var routes = [
  {
    path: '/',
    async: function ({ router, to, resolve }) {
      console.log('Navigating to /');
      let uinfo = userInfo.getUserInfo();
      if (!uinfo) {
        resolve({
          component: LoginPage
        })
      } else {
        if (uinfo.role === 'clinician') {
          console.log('Navigating to clinician page');
        } else if (uinfo.role === 'admin') {
          console.log('Navigating to admin page');
        } else {
          console.log('Unknown user role: ' + uinfo.role);
        }
      }
    }
  },
  {
    path: '/login/',
    component: LoginPage,
  },
  {
    path: '/clinicians/new-account/',
    component: newAccountPage,
  },
  {
    path: '(.*)',
    component: NotFoundPage,
  },
];

export default routes;
