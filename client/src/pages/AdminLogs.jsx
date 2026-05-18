import { useEffect, useState } from 'react';
import { Activity, Brain } from 'lucide-react';
import api from '../api/axios';

const AdminLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setMessage('');
    try {
      const [auditRes, aiRes] = await Promise.all([
        api.get('/audit-logs'),
        api.get('/audit-logs/ai-requests')
      ]);
      setAuditLogs(auditRes.data.data || []);
      setAiLogs(aiRes.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading system logs...</div>;

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Activity className="h-5 w-5 text-blue-600" /> Audit Trail
        </h2>
        <LogTable logs={auditLogs} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Brain className="h-5 w-5 text-violet-600" /> AI Usage Logs
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Feature</th>
                <th className="px-3 py-3">Success</th>
                <th className="px-3 py-3">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiLogs.length === 0 && <tr><td className="px-3 py-4 text-slate-500" colSpan="5">No AI calls logged yet.</td></tr>}
              {aiLogs.map((log) => (
                <tr key={log._id}>
                  <td className="px-3 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3 text-slate-700">{log.userId?.name || 'Unknown'}</td>
                  <td className="px-3 py-3 text-slate-700">{log.feature}</td>
                  <td className="px-3 py-3">{log.success ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-3 text-slate-500">{log.latency || 0} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const LogTable = ({ logs }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr>
          <th className="px-3 py-3">Time</th>
          <th className="px-3 py-3">User</th>
          <th className="px-3 py-3">Action</th>
          <th className="px-3 py-3">Target</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.length === 0 && <tr><td className="px-3 py-4 text-slate-500" colSpan="4">No audit logs yet.</td></tr>}
        {logs.map((log) => (
          <tr key={log._id}>
            <td className="px-3 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
            <td className="px-3 py-3 text-slate-700">{log.userId?.name || 'Unknown'}</td>
            <td className="px-3 py-3 font-medium text-slate-800">{log.action}</td>
            <td className="px-3 py-3 text-slate-600">{log.targetModel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AdminLogs;
