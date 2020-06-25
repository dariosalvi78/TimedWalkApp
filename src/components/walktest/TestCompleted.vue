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
      // we don't need to keep the log any longer now
      try {
        await files.deleteLog(TMP_FILENAME)
      } catch (e) {
        console.error(e)
      }
      this.$parent.pageStack.splice(1, 2)
    },
    async share () {
      try {
        let filePath = await files.getFilePath(TMP_FILENAME, true)
        await new Promise((resolve, reject) => {
          window.plugins.socialsharing.shareWithOptions({
            message: this.$t('walk.shareMesssage', {date: this.testReport.date}),
            subject: this.$t('walk.shareTopic'),
            files: [filePath]
          }, resolve, reject)
        })
      } catch (err) {
        console.log('cannot share file', err)
      }
    }
  }
}
</script>

<style>
</style>
