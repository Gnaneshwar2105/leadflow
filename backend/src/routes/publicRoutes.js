const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

// Public lead-capture endpoint - no auth. This is the only write path
// available to unauthenticated callers, and it can only ever create a
// lead in the 'new' status - it cannot touch status, assignment, or notes.
router.post('/leads', async (req, res, next) => {
  try {
    const { name, email, phone, company, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    const lead = await Lead.create({
      name,
      email,
      phone,
      company,
      message,
      source: 'public_form',
      activity: [{ action: 'created', meta: { source: 'public_form' } }],
    });

    res.status(201).json({ id: lead._id, message: 'Thanks — we will be in touch shortly.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
