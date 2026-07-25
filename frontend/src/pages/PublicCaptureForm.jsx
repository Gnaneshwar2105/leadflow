import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Footer from '../components/Footer';

const initialForm = { name: '', email: '', phone: '', company: '', message: '' };

export default function PublicCaptureForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await api.submitPublicLead(form);
      setStatus('success');
      setForm(initialForm);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <div className="page public-page">
      <div className="card">
        <h1>Talk to us</h1>
        <p className="muted">Tell us a bit about your project and we'll get back to you shortly.</p>

        {status === 'success' ? (
          <div className="success-box">Thanks — your message has been received. We'll be in touch.</div>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label>
              Name *
              <input required value={form.name} onChange={update('name')} />
            </label>
            <label>
              Email *
              <input required type="email" value={form.email} onChange={update('email')} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={update('phone')} />
            </label>
            <label>
              Company
              <input value={form.company} onChange={update('company')} />
            </label>
            <label>
              Message
              <textarea rows={4} value={form.message} onChange={update('message')} />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}

        <p className="muted small">
          Team member? <Link to="/login">Sign in</Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
