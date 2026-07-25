const Lead = require('../models/Lead');
const { LEAD_STATUSES } = require('../models/Lead');

// Members only see leads that are unassigned or assigned to them.
// Admins see everything. This is enforced server-side, not just hidden in the UI.
function scopeToUser(query, user) {
  if (user.role === 'admin') return query;
  return { ...query, $or: [{ assignedTo: user._id }, { assignedTo: null }] };
}

async function listLeads(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { status, assignedTo, q } = req.query;

    let filter = {};
    if (status) {
      if (!LEAD_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status: ${status}` });
      filter.status = status;
    }
    if (assignedTo) filter.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    if (q) filter.$text = { $search: q };

    filter = scopeToUser(filter, req.user);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('notes.author', 'name role')
      .populate('activity.actor', 'name role');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (req.user.role !== 'admin') {
      const isVisible = !lead.assignedTo || lead.assignedTo._id.equals(req.user._id);
      if (!isVisible) return res.status(403).json({ error: 'Not permitted to view this lead' });
    }

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${LEAD_STATUSES.join(', ')}` });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (req.user.role !== 'admin' && lead.assignedTo && !lead.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not permitted to modify this lead' });
    }

    const from = lead.status;
    lead.status = status;
    lead.activity.push({ action: 'status_changed', actor: req.user._id, meta: { from, to: status } });
    await lead.save();

    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

// Admin-only: reassignment is a management decision, not a self-service one
async function assignLead(req, res, next) {
  try {
    const { userId } = req.body; // null/undefined -> unassign
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const from = lead.assignedTo;
    lead.assignedTo = userId || null;
    lead.activity.push({
      action: 'assigned',
      actor: req.user._id,
      meta: { from: from ? from.toString() : null, to: userId || null },
    });
    await lead.save();

    const populated = await lead.populate('assignedTo', 'name email role');
    res.json({ lead: populated });
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Note text is required' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (req.user.role !== 'admin' && lead.assignedTo && !lead.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not permitted to modify this lead' });
    }

    lead.notes.push({ text: text.trim(), author: req.user._id });
    lead.activity.push({ action: 'note_added', actor: req.user._id });
    await lead.save();

    const populated = await lead.populate('notes.author', 'name role');
    res.status(201).json({ lead: populated });
  } catch (err) {
    next(err);
  }
}

// Admin-only: deleting a lead is destructive and irreversible
async function deleteLead(req, res, next) {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listLeads, getLead, updateStatus, assignLead, addNote, deleteLead };
