const mongoose = require('mongoose');

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. 'status_changed', 'assigned', 'note_added', 'created'
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for public-form-created events
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, default: 'public_form' },
    message: { type: String, trim: true },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    notes: [noteSchema],
    activity: [activitySchema],
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', email: 'text', company: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STATUSES = LEAD_STATUSES;
