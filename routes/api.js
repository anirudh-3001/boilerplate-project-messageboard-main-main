'use strict';
const Thread = require('../models/thread');
const bcrypt = require('bcrypt');

module.exports = function (app) {

  app.route('/api/threads/:board')
    .post(async function (req, res) {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(delete_password, 10);

        const newThread = new Thread({
          text,
          delete_password: hashedPassword,
          board
        });

        await newThread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .get(async function (req, res) {
      const board = req.params.board;

      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .select('-reported -delete_password')
          .lean();

        // Limit replies to 3 most recent and remove fields
        threads.forEach(thread => {
          thread.replies = thread.replies
            .slice(-3)
            .reverse()
            .map(reply => {
              const { reported, delete_password, ...safeReply } = reply;
              return safeReply;
            });
        });

        res.json(threads);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .delete(async function (req, res) {
      const { thread_id, delete_password } = req.body;

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('Thread not found');

        // Compare passwords
        const match = await bcrypt.compare(delete_password, thread.delete_password);
        if (!match) return res.send('incorrect password');

        await Thread.findByIdAndDelete(thread_id);
        res.send('success');
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .put(async function (req, res) {
      const { thread_id } = req.body;

      try {
        await Thread.findByIdAndUpdate(thread_id, { reported: true });
        res.send('reported');
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

  app.route('/api/replies/:board')
      .post(async function (req, res) {
        const { thread_id, text, delete_password } = req.body;
        const board = req.params.board;

        try {
          // Hash the password
          const hashedPassword = await bcrypt.hash(delete_password, 10);

          // Create a single timestamp for both the reply and bumped_on
          const now = new Date();

          const updatedThread = await Thread.findByIdAndUpdate(
              thread_id,
              {
                $push: {
                  replies: {
                    text,
                    delete_password: hashedPassword,
                    created_on: now
                  }
                },
                bumped_on: now
              },
              { new: true }
          );

          res.redirect(`/b/${board}/${thread_id}`);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      })
    .get(async function (req, res) {
      const thread_id = req.query.thread_id;

      try {
        const thread = await Thread.findById(thread_id)
          .select('-reported -delete_password')
          .lean();

        if (!thread) return res.send('Thread not found');

        // Remove sensitive fields from replies
        thread.replies = thread.replies.map(reply => {
          const { reported, delete_password, ...safeReply } = reply;
          return safeReply;
        });

        res.json(thread);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .delete(async function (req, res) {
      const { thread_id, reply_id, delete_password } = req.body;

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.send('Reply not found');

        // Compare passwords
        const match = await bcrypt.compare(delete_password, reply.delete_password);
        if (!match) return res.send('incorrect password');

        // Set text to [deleted] instead of removing
        reply.text = '[deleted]';
        await thread.save();
        res.send('success');
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
    .put(async function (req, res) {
      const { thread_id, reply_id } = req.body;

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.send('Reply not found');

        reply.reported = true;
        await thread.save();
        res.send('reported');
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
};
