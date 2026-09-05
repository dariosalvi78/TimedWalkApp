<template>
  <f7-panel right cover dark>
    <f7-view>
      <f7-page>
        <f7-navbar title="Dario Salvi"></f7-navbar>
        <f7-block>
          <h3>Current team: {{ selectedTeam ? selectedTeam.name : 'None' }}</h3>
          <f7-list inset strong>
            <f7-list-item title="Change team" popover-open=".popover-menu" link="#"></f7-list-item>


            <f7-list-item title="Logout" link="/login/?logout=true" view=".view-main" panel-close></f7-list-item>


          </f7-list>

        </f7-block>
      </f7-page>
    </f7-view>
  </f7-panel>

  <f7-page name="clinician-home" id="panel-page">

    <f7-navbar title="Home">
      <!-- <f7-nav-right>
        <f7-icon f7="person"></f7-icon>
      </f7-nav-right> -->
      <f7-nav-right>
        <f7-icon f7="person"></f7-icon>
        <f7-button tonal panel-open="right">Settings</f7-button>
      </f7-nav-right>
    </f7-navbar>

    <f7-block-title>Patients</f7-block-title>
    <f7-block>
      <div class="card data-table">
        <table>
          <thead>
            <tr>
              <th class="input-cell">
                <span class="table-head-label">ID</span>
                <div class="input" style="width: 50px">
                  <input type="number" placeholder="Filter" />
                </div>
              </th>
              <th class="input-cell">
                <span class="table-head-label">Names</span>
                <div class="input">
                  <input type="text" placeholder="Filter" />
                </div>
              </th>
              <th class="input-cell">
                <span class="table-head-label">Date of Birth</span>
                <div class="input">
                  <input type="date" placeholder="Filter" />
                </div>
              </th>
              <th class="input-cell">
                <span class="table-head-label">Last test</span>
                <div class="input">
                  <input type="date" placeholder="Filter" />
                </div>
              </th>
              <th class="input-cell">
                <span class="table-head-label">Last distance</span>
                <div class="input">
                  <input type="number" placeholder="Filter" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>John Doe</td>
              <td>1990-01-01</td>
              <td>2023-01-01</td>
              <td>100</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Jane Doe</td>
              <td>1990-01-01</td>
              <td>2023-01-01</td>
              <td>200</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Vladimir Kharlampidi</td>
              <td>1990-01-01</td>
              <td>2023-01-01</td>
              <td>300</td>
            </tr>
            <tr>
              <td>4</td>
              <td>Jennifer Doe</td>
              <td>1990-01-01</td>
              <td>2023-01-01</td>
              <td>400</td>
            </tr>
          </tbody>
        </table>
      </div>
    </f7-block>

    <f7-popover class="popover-menu">
      <f7-list inset strong>
        <f7-list-button v-for="team in teams" :key="team.p_id" popover-close :title="team.name"
          @click="() => { selectedTeam = team; }" />
      </f7-list>
    </f7-popover>
  </f7-page>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../../js/api.js';

export default {
  setup () {
    const isPanelOpened = ref(false)
    const teams = ref([])
    const selectedTeam = ref(null)

    onMounted(async () => {
      teams.value = await api.getClinicianTeams()
      selectedTeam.value = teams.value[0]
      console.log('selectedTeam', selectedTeam.value)
    })

    return {
      teams,
      selectedTeam,
      isPanelOpened
    }
  },


};
</script>
