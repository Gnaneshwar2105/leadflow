import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Footer from '../components/Footer';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function LeadDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [lead, setLead] = useState(null);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLead(token, id);
      setLead(data.lead);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.listUsers(token).then((d) => setUsers(d.users)).catch(() => {});
    }
  }, [user, token]);

  async function handleStatusChange(e) {
    try {
      const data = await api.updateStatus(token, id, e.target.value);
      setLead(data.lead);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssign(e) {
    try {
      const data = await api.assignLead(token, id, e.target.value || null);
      setLead(data.lead);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      const data = await api.addNote(token, id, note);
      setLead(data.lead);
      setNote('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (error && !lead) return <div className="page error-box">{error}</div>;
  if (!lead) return null;

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">
        ← Back to dashboard
      </Link>

      <div className="card">
        <h1>{lead.name}</h1>
        <p className="muted">
          {lead.email} {lead.phone ? `· ${lead.phone}` : ''} {lead.company ? `· ${lead.company}` : ''}
        </p>
        {lead.message && <p>{lead.message}</p>}

        {error && <div className="error-box">{error}</div>}

        <div className="lead-controls">
          <label>
            Status
            <select value={lead.status} onChange={handleStatusChange}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {user.role === 'admin' && (
            <label>
              Assigned to
              <select value={lead.assignedTo?._id || ''} onChange={handleAssign}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Notes</h2>
        <form onSubmit={handleAddNote} className="note-form">
          <textarea
            rows={2}
            placeholder="Add a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit">Add note</button>
        </form>
        <ul className="notes-list">
          {lead.notes.length === 0 && <li className="muted">No notes yet.</li>}
          {lead.notes.map((n) => (
            <li key={n._id}>
              <div>{n.text}</div>
              <div className="muted small">
                {n.author?.name || 'Unknown'} · {new Date(n.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Activity</h2>
        <ul className="activity-list">
          {lead.activity
            .slice()
            .reverse()
            .map((a) => (
              <li key={a._id}>
                <span className="muted small">{new Date(a.createdAt).toLocaleString()}</span>{' '}
                <strong>{a.action.replace('_', ' ')}</strong>
                {a.actor?.name ? ` by ${a.actor.name}` : ' (system)'}
              </li>
            ))}
        </ul>
      </div>

      <Footer />
    </div>
  );
}
