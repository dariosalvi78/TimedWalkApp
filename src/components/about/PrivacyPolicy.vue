<template id="aboutprovacypolicy">
  <v-ons-page>
    <v-ons-toolbar>
      <div class="left">
        <v-ons-back-button>About</v-ons-back-button>
      </div>
      <div class="center">Privacy Policy</div>
    </v-ons-toolbar>
    <div class="content" style="padding: 10px;">
      When you perform a test, this app retrieves the following information from
      your phone:
      <ul>
        <li>
          The geographical position of your phone. This is used to compute
          the distance you walk.
        </li>
        <li>
          The number of steps you walk (if provided by your phone).
          This is used to complement the information about the distance.
        </li>
      </ul>
      At the end of each step, the date of the tes, the duration, the distance
      you have walked and the number of steps are recorded on yuor phone.
      This data is not sentt on the Internet and is not shared with any institution,
      company, or individual.
      <br>
      To  keep your data safe, it is recommendable to set a password, or any other
      protection mean, on your phone, to prevent any unauthorised person to
      access your data.
    </div>
  </v-ons-page>
</template>

<script>
export default {
  name: 'AboutProvacyPolicyPage'
}
</script>

<style>
</style>
