import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Footer from '../components/Footer';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listLeads(token, { page, limit: 10, status, q });
      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page dashboard">
      <header className="topbar">
        <h1>LeadFlow</h1>
        <div className="topbar-right">
          <span className="muted">
            {user?.name} · {user?.role}
          </span>
          <button className="link-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="filters">
        <input
          placeholder="Search name, email, company…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}

      <table className="lead-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Status</th>
            <th>Assigned to</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>Loading…</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5}>No leads match these filters.</td>
            </tr>
          ) : (
            items.map((lead) => (
              <tr key={lead._id}>
                <td>
                  <Link to={`/leads/${lead._id}`}>{lead.name}</Link>
                  <div className="muted small">{lead.email}</div>
                </td>
                <td>{lead.company || '—'}</td>
                <td>
                  <span className={`badge badge-${lead.status}`}>{lead.status}</span>
                </td>
                <td>{lead.assignedTo?.name || 'Unassigned'}</td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>

      <Footer />
    </div>
  );
}
