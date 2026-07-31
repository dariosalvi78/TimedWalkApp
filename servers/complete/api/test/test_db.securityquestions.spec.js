import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to users security questions,', () => {
  const testDBName = 'testsecurityquestions'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  describe('when 2 users are created,', () => {
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

    after(async () => {
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE id = $1`, [user1.id])
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE id = $1`, [user2.id])
    })

    test('a new security question can be created and deleted', async () => {
      let securityQuestion = {
        user_id: user1.id,
        question: 'What is your favorite color?',
        answer_hash: 'hashed_answer'
      }
      let createdSecurityQuestion = await dbaccess.createUserSecurityQuestion(dbclient, securityQuestion)
      assert.strictEqual(createdSecurityQuestion.user_id, securityQuestion.user_id)
      assert.strictEqual(createdSecurityQuestion.question, securityQuestion.question)
      assert.strictEqual(createdSecurityQuestion.answer_hash, securityQuestion.answer_hash)

      let deleted = await dbaccess.deleteUserSecurityQuestion(dbclient, { id: createdSecurityQuestion.id })
      assert.strictEqual(deleted, true)
    })

    describe('when 3 security questions are created,', () => {
      let securityQuestion1, securityQuestion2, securityQuestion3
      before(async () => {
        let res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "user_security_questions" (user_id, question, answer_hash, created_at)
                      VALUES ($1, 'What is your favorite color?', 'hashed_answer_1', NOW())
                      RETURNING *`,
          [user1.id]
        )
        securityQuestion1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                          INSERT INTO "user_security_questions" (user_id, question, answer_hash, created_at)
                          VALUES ($1, 'What is your favorite animal?', 'hashed_answer_2', NOW())
                          RETURNING *`,
          [user1.id]
        )
        securityQuestion2 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                          INSERT INTO "user_security_questions" (user_id, question, answer_hash, created_at)
                          VALUES ($1, 'What is your favorite food?', 'hashed_answer_3', NOW())
                          RETURNING *`,
          [user2.id]
        )
        securityQuestion3 = res.rows[0]
      })

      after(async () => {
        await dbtools.query(dbclient, `DELETE FROM "user_security_questions" WHERE id = $1`, [securityQuestion1.id])
        await dbtools.query(dbclient, `DELETE FROM "user_security_questions" WHERE id = $1`, [securityQuestion2.id])
        await dbtools.query(dbclient, `DELETE FROM "user_security_questions" WHERE id = $1`, [securityQuestion3.id])
      })

      test('all security questions can be retrieved', async () => {
        let securityQuestions = await dbaccess.getUserSecurityQuestions(dbclient, null)
        assert.strictEqual(securityQuestions.length, 3, 'Expected exactly 3 security questions')
      })
    })
  })
})
