<template id="testCompleted">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center;">
      <h1>
        {{$t('walk.completed')}}
      </h1>
      <div style="margin-top: 20px;"><b>{{$t('walk.distance')}}: </b> {{ testReport.distance.toFixed(2) }} meters</div>
      <div style="margin-top: 20px;"><b>{{$t('walk.duration')}}: </b> {{ testReport.duration }} minutes</div>
      <div v-if="testReport.steps" style="margin-top: 20px;"><b>{{$t('walk.steps')}}: </b> {{ testReport.steps }}</div>
      <div style="margin-top: 40px;">
        <v-ons-button modifier="outline" @click="share">
          <v-ons-icon icon="fa-share-alt"></v-ons-icon>
          {{$t('walk.shareButton')}}
        </v-ons-button>
      </div>
      <div style="margin-top: 40px;">
        <v-ons-button @click="reset">
          {{$t('walk.restart')}}
        </v-ons-button>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import storage from '../../modules/storage'
import files from '../../modules/files'

const socialsharingExists = window.plugins && window.plugins.socialsharing && window.plugins.socialsharing.share
const TMP_FILENAME = 'timedwalk.txt'

export default {
  name: 'TestCompletedPage',
  props: [ 'testReport' ],
  async mounted () {
    // auto save
    console.log('saving test')
    // save the results
    let history = await storage.getItem('history')
    if (!history) history = []
    history.push(this.testReport)
    await storage.setItem('history', history)
  },
  methods: {
    async reset () {
      this.$parent.pageStack.splice(1, 2)
    },
    async share () {
      console.log('sharing details')
      if (socialsharingExists) {
        let log = await files.readLog(TMP_FILENAME)
        window.plugins.socialsharing.share(log, this.$t('walk.shareTopic'))
      }
    }
  }
}
</script>

<style>
</style>
