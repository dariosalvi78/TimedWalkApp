<template id="testCompleted">
  <v-ons-page>
    <div class="content" style="padding: 10px; text-align: center;">
      <h1>
        {{$t('walk.completed')}}
      </h1>
      <div style="margin-top: 20px;"><b>{{$t('walk.distance')}}: </b> {{ testReport.distance.toFixed(2) }} meters</div>
      <div style="margin-top: 20px;"><b>{{$t('walk.duration')}}: </b> {{ testReport.duration }} minutes</div>
      <div v-if="testReport.steps" style="margin-top: 20px;"><b>{{$t('walk.steps')}}: </b> {{ testReport.steps }}</div>
      <!-- Negative warning block -->
      <div 
        v-if="testReport.quality && testReport.quality.hasWarning"
        style="margin-top: 20px; padding: 15px; background-color: #ffe6e6; border: 1px solid #ff4d4d; border-radius: 8px;">
        <v-ons-icon icon="fa-exclamation-triangle" style="color: #cc0000;" size="24px"></v-ons-icon>

        <!-- Sampling frequency warning -->
        <div v-if="testReport.quality.warningLowSampling" style="margin-top: 10px;">
          <b>{{$t('walk.fs')}}:</b>
          {{ testReport.quality.samplingFrequency.toFixed(2) }} Hz
          <div>
            Be careful to keep the phone screen on during the whole walk. (low fs)
          </div>
        </div>

        <!-- Large gap warning -->
        <div v-if="testReport.quality.warningLargeGap" style="margin-top: 10px;">
          <div>
            Be careful to keep the phone screen on during the whole walk. (data gaps)
          </div>
        </div>

        <!-- Curvature / path irregularity warning -->
        <!-- <div>
          DEBUG: curvature={{ testReport.curvature }}
          warningCurvature={{ testReport.quality.warningCurvature }}
        </div> -->
        <div v-if="testReport.quality.warningCurvature" style="margin-top: 10px;">
          <b>{{$t('walk.curvature')}}:</b> {{ testReport.curvature.label_txt }}
          <div>
            Too many turns or irregular path, try to walk in a straighter path.
          </div>
        </div>
      </div>

      <!-- Positive warning block -->
       <div 
          v-if="testReport.quality && !testReport.quality.hasWarning"
          style="margin-top: 20px; padding: 15px; background-color: #e6ffe6; border: 1px solid #33cc33; border-radius: 8px;">
          <v-ons-icon icon="fa-check-circle" style="color: #2eb82e;" size="24px"></v-ons-icon>
          <div style="margin-top: 10px;">
            <b>{{$t('walk.goodQuality')}}</b>
          </div>
        </div>

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
    console.log('Saving test in history')
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
        this.$ons.notification.toast(this.$t('walk.fileError'), { timeout: 1000 })
        console.log('cannot share file', err)
      }
    }
  }
}
</script>

<style>
</style>
