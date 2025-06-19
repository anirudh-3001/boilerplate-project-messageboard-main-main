const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let testThreadId;
  let testReplyId;

  suite('API ROUTING FOR /api/threads/:board', function() {
    suite('POST', function() {
      test('Create a new thread', function(done) {
        chai.request(server)
          .post('/api/threads/test')
          .send({
            text: 'Test Thread',
            delete_password: 'password123'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function() {
      test('View the 10 most recent threads with 3 replies each', function(done) {
        chai.request(server)
          .get('/api/threads/test')
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10);
            if (res.body.length > 0) {
              const thread = res.body[0];
              assert.property(thread, '_id');
              assert.property(thread, 'text');
              assert.property(thread, 'created_on');
              assert.property(thread, 'bumped_on');
              assert.property(thread, 'replies');
              assert.notProperty(thread, 'reported');
              assert.notProperty(thread, 'delete_password');
              assert.isArray(thread.replies);
              assert.isAtMost(thread.replies.length, 3);
              testThreadId = thread._id;
            }
            done();
          });
      });
    });

    suite('DELETE', function() {
      test('Delete a thread with incorrect password', function(done) {
        chai.request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: testThreadId,
            delete_password: 'wrong_password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });

      test('Delete a thread with correct password', function(done) {
        // Create a new thread to delete
        chai.request(server)
          .post('/api/threads/test')
          .send({
            text: 'Thread to Delete',
            delete_password: 'correctPassword'
          })
          .end(function(err, res) {
            // Get the thread ID
            chai.request(server)
              .get('/api/threads/test')
              .end(function(err, res) {
                const threadToDelete = res.body.find(t => t.text === 'Thread to Delete');
                // Delete the thread
                chai.request(server)
                  .delete('/api/threads/test')
                  .send({
                    thread_id: threadToDelete._id,
                    delete_password: 'correctPassword'
                  })
                  .end(function(err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'success');
                    done();
                  });
              });
          });
      });
    });

    suite('PUT', function() {
      test('Report a thread', function(done) {
        chai.request(server)
          .put('/api/threads/test')
          .send({
            thread_id: testThreadId
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'reported');
            done();
          });
      });
    });
  });

  suite('API ROUTING FOR /api/replies/:board', function() {
    suite('POST', function() {
      test('Create a new reply', function(done) {
        chai.request(server)
          .post('/api/replies/test')
          .send({
            thread_id: testThreadId,
            text: 'Test Reply',
            delete_password: 'replyPassword'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function() {
      test('View a single thread with all replies', function(done) {
        chai.request(server)
          .get(`/api/replies/test?thread_id=${testThreadId}`)
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.property(res.body, 'replies');
            assert.notProperty(res.body, 'delete_password');
            assert.notProperty(res.body, 'reported');
            assert.isArray(res.body.replies);
            if (res.body.replies.length > 0) {
              const reply = res.body.replies[0];
              assert.property(reply, '_id');
              assert.property(reply, 'text');
              assert.property(reply, 'created_on');
              assert.notProperty(reply, 'delete_password');
              assert.notProperty(reply, 'reported');
              testReplyId = reply._id;
            }
            done();
          });
      });
    });

    suite('PUT', function() {
      test('Report a reply', function(done) {
        chai.request(server)
          .put('/api/replies/test')
          .send({
            thread_id: testThreadId,
            reply_id: testReplyId
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'reported');
            done();
          });
      });
    });

    suite('DELETE', function() {
      test('Delete a reply with incorrect password', function(done) {
        chai.request(server)
          .delete('/api/replies/test')
          .send({
            thread_id: testThreadId,
            reply_id: testReplyId,
            delete_password: 'wrongPassword'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });

      test('Delete a reply with correct password', function(done) {
        // Create a thread and reply to delete
        chai.request(server)
          .post('/api/threads/test')
          .send({
            text: 'Thread for Reply to Delete',
            delete_password: 'threadPassword'
          })
          .end(function(err, res) {
            // Get the thread ID
            chai.request(server)
              .get('/api/threads/test')
              .end(function(err, res) {
                const threadForReply = res.body.find(t => t.text === 'Thread for Reply to Delete');
                // Create a reply
                chai.request(server)
                  .post('/api/replies/test')
                  .send({
                    thread_id: threadForReply._id,
                    text: 'Reply to Delete',
                    delete_password: 'correctPassword'
                  })
                  .end(function(err, res) {
                    // Get the reply ID
                    chai.request(server)
                      .get(`/api/replies/test?thread_id=${threadForReply._id}`)
                      .end(function(err, res) {
                        const replyToDelete = res.body.replies.find(r => r.text === 'Reply to Delete');
                        // Delete the reply
                        chai.request(server)
                          .delete('/api/replies/test')
                          .send({
                            thread_id: threadForReply._id,
                            reply_id: replyToDelete._id,
                            delete_password: 'correctPassword'
                          })
                          .end(function(err, res) {
                            assert.equal(res.status, 200);
                            assert.equal(res.text, 'success');
                            done();
                          });
                      });
                  });
              });
          });
      });
    });
  });
});
