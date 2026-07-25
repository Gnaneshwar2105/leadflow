const express = require('express');
const {
  listLeads,
  getLead,
  updateStatus,
  assignLead,
  addNote,
  deleteLead,
} = require('../controllers/leadController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // everything below requires a logged-in user

router.get('/', listLeads);
router.get('/:id', getLead);
router.patch('/:id/status', updateStatus); // admin or the assigned member
router.patch('/:id/assign', requireRole('admin'), assignLead);
router.post('/:id/notes', addNote); // admin or the assigned member
router.delete('/:id', requireRole('admin'), deleteLead);

module.exports = router;
