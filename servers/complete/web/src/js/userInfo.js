const USER_INFO_KEY = 'userinfo';

export default {
  setUserInfo (name, type) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify({
      displayName: name,
      userType: type
    }));
  },
  getUserInfo () {
    // Reading the data
    const prefs = JSON.parse(localStorage.getItem(USER_INFO_KEY))
    return prefs;
  }
}
