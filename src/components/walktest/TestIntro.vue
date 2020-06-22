<template id="testIntro">
  <v-ons-page>
    <div class="content" style="padding: 10px;">
      <h3 style="text-align: center;">{{$t('walk.walkIntro.title')}}</h3>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-walking" size="30px"></v-ons-icon>
      </p>
      <div v-html="$t('walk.walkIntro.walk')"></div>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-dizzy" size="30px"></v-ons-icon>
      </div>
      <div v-html="$t('walk.walkIntro.warnings')"></div>

      <p style="text-align: center;">
        <v-ons-icon icon="fa-road" size="30px"></v-ons-icon>
      </p>
      <div v-html="$t('walk.walkIntro.path')"></div>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-sun" size="30px"></v-ons-icon>
      </div>
      <div v-html="$t('walk.walkIntro.weather')"></div>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-map-marker-alt" size="30px"></v-ons-icon>
      </div>
      <div v-html="$t('walk.walkIntro.gps')"></div>

      <div style="text-align: center; margin-top: 10px;">
        <v-ons-icon icon="fa-ruler" size="30px"></v-ons-icon>
      </div>
      <div v-html="$t('walk.walkIntro.duration')"></div>

      <div style="text-align: center;">
        {{$t('walk.walkIntro.minutes')}}: {{ duration }}
        <v-ons-range v-model="duration" style="width: 100%;" min="3" max="15" step="1"></v-ons-range>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <v-ons-button @click="startTest">{{$t('walk.walkIntro.start')}}</v-ons-button>
      </div>
    </div>
  </v-ons-page>
</template>

<script>
import testWalk from './TestWalk'
import storage from '../../modules/storage'

export default {
  name: 'TestIntroPage',
  data () {
    return {
      duration: 6
    }
  },
  methods: {
    async startTest () {
      // store duration so the next time is already set by default
      await storage.setItem('duration', this.duration)
      this.$emit('push-page', testWalk)
    }
  },
  async created () {
    // get last stored duration
    let dur = await storage.getItem('duration')
    if (dur) {
      this.duration = dur
    }
  }
}
</script>

<style>
</style>
