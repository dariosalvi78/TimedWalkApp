import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing db access to user device ids,', () => {
  const testDBName = 'testuserdeviceids'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  describe('when 2 users exists', () => {
    let user1, user2
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                INSERT INTO "users" (role, email, created_at, last_login_at)
                VALUES ('clinician', 'sofia@mau.se', NOW(), NOW())
                RETURNING *`,
      )
      user1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                    INSERT INTO "users" (role, email, created_at, last_login_at)
                    VALUES ('clinician', 'anthony@mau.se', NOW(), NOW())
                    RETURNING *`,
      )
      user2 = res.rows[0]
    })

    test('a new device id can be created and deleted', async () => {
      let deviceId = {
        p_id: 'c4556504-74a5-420e-b0f4-70a79a43380d',
        user_id: user1.id
      }
      let createdDeviceId = await dbaccess.createDeviceId(dbclient, deviceId)
      assert.strictEqual(createdDeviceId.p_id, deviceId.p_id)
      assert.strictEqual(createdDeviceId.user_id, deviceId.user_id)

      let deleted = await dbaccess.deleteDeviceId(dbclient, createdDeviceId.p_id)
      assert.strictEqual(deleted, true)
    })

    describe('when 2 device ids are created for user1,', () => {
      let deviceId1, deviceId2
      before(async () => {
        let res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "user_device_ids" (p_id, user_id, created_at)
                  VALUES ('c4556504-74a5-420e-b0f4-70a79a43380d', ${user1.id}, NOW())
                  RETURNING *`,
        )
        deviceId1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "user_device_ids" (p_id, user_id, created_at)
                      VALUES ('d4556504-74a5-420e-b0f4-70a79a43380d', ${user1.id}, NOW())
                      RETURNING *`,
        )
        deviceId2 = res.rows[0]
      })

      test('all device ids for user1 can be retrieved', async function () {
        let deviceIds = await dbaccess.getDeviceIds(dbclient, { user_id: user1.id })
        assert.strictEqual(deviceIds.length, 2)
      })

      test('device id c4556504-74a5-420e-b0f4-70a79a43380d can be retrieved', async function () {
        let deviceIds = await dbaccess.getDeviceIds(dbclient, { p_id: 'c4556504-74a5-420e-b0f4-70a79a43380d' })
        assert.strictEqual(deviceIds.length, 1)
        assert.strictEqual(deviceIds[0].p_id, 'c4556504-74a5-420e-b0f4-70a79a43380d')
      })

    })
  })

})
