import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ChangeRequest } from '../lib/database.types';
import { Check, X, Play, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface ChangeRequestListProps {
  changes: ChangeRequest[];
  onUpdate: () => void;
}

export function ChangeRequestList({ changes, onUpdate }: ChangeRequestListProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [testNotes, setTestNotes] = useState('');
  const [showTestModal, setShowTestModal] = useState<string | null>(null);

  const isChangeAdmin = profile?.is_change_admin || false;
  const isChangeTester = profile?.is_change_tester || false;

  const createHistory = async (changeId: string, action: string, oldStatus: string, newStatus: string, notes?: string) => {
    await supabase.from('change_history').insert({
      change_request_id: changeId,
      action,
      performed_by: user?.id,
      performer_name: profile?.full_name,
      old_status: oldStatus,
      new_status: newStatus,
      notes: notes || null,
    });
  };

  const handleSubmitForApproval = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({ status: 'pending_approval' })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'submitted', change.status, 'pending_approval');
      onUpdate();
    } catch (err) {
      console.error('Error submitting for approval:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'approved', change.status, 'approved');
      onUpdate();
    } catch (err) {
      console.error('Error approving change:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'rejected', change.status, 'rejected', rejectionReason);
      setShowRejectModal(null);
      setRejectionReason('');
      onUpdate();
    } catch (err) {
      console.error('Error rejecting change:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setLoading(null);
    }
  };

  const handleStartTesting = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({ status: 'in_testing' })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'testing_started', change.status, 'in_testing');
      onUpdate();
    } catch (err) {
      console.error('Error starting testing:', err);
      setError(err instanceof Error ? err.message : 'Failed to start testing');
    } finally {
      setLoading(null);
    }
  };

  const handleTestResult = async (changeId: string, result: 'pass' | 'fail') => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const newStatus = result === 'pass' ? 'test_passed' : 'test_failed';

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({
          status: newStatus,
          tested_by: user?.id,
          tested_at: new Date().toISOString(),
          test_result: result,
          test_notes: testNotes,
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(
        changeId,
        result === 'pass' ? 'test_passed' : 'test_failed',
        change.status,
        newStatus,
        testNotes
      );

      setShowTestModal(null);
      setTestNotes('');
      onUpdate();
    } catch (err) {
      console.error('Error updating test result:', err);
      setError(err instanceof Error ? err.message : 'Failed to update test result');
    } finally {
      setLoading(null);
    }
  };

  const handleSchedule = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({ status: 'scheduled' })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'scheduled', change.status, 'scheduled');
      onUpdate();
    } catch (err) {
      console.error('Error scheduling change:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setLoading(null);
    }
  };

  const handleComplete = async (changeId: string) => {
    setLoading(changeId);
    setError('');

    try {
      const change = changes.find(c => c.id === changeId);
      if (!change) return;

      const { error: updateError } = await supabase
        .from('change_requests')
        .update({
          status: 'completed',
          completed_by: user?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      await createHistory(changeId, 'completed', change.status, 'completed');
      onUpdate();
    } catch (err) {
      console.error('Error completing change:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-slate-100 text-slate-800', label: 'Draft' },
      pending_approval: { color: 'bg-amber-100 text-amber-800', label: 'Pending Approval' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      in_testing: { color: 'bg-blue-100 text-blue-800', label: 'In Testing' },
      test_passed: { color: 'bg-emerald-100 text-emerald-800', label: 'Test Passed' },
      test_failed: { color: 'bg-red-100 text-red-800', label: 'Test Failed' },
      scheduled: { color: 'bg-violet-100 text-violet-800', label: 'Scheduled' },
      completed: { color: 'bg-slate-100 text-slate-600', label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, string> = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-amber-100 text-amber-800',
      High: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {changes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No change requests found</p>
        </div>
      ) : (
        changes.map(change => (
          <div key={change.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{change.title}</h3>
                <p className="text-slate-600 mb-4">{change.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getStatusBadge(change.status)}
                  {getPriorityBadge(change.priority)}
                </div>
                <div className="flex gap-4 text-sm text-slate-600">
                  <div>
                    <span className="font-medium">Start:</span>{' '}
                    {new Date(change.start_date).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">End:</span>{' '}
                    {new Date(change.end_date).toLocaleString()}
                  </div>
                </div>
                {change.test_notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-900 mb-1">Test Notes:</p>
                    <p className="text-sm text-slate-600">{change.test_notes}</p>
                  </div>
                )}
                {change.rejection_reason && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-600">{change.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
              {change.status === 'draft' && change.created_by === user?.id && (
                <button
                  onClick={() => handleSubmitForApproval(change.id)}
                  disabled={loading === change.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Submit for Approval
                </button>
              )}

              {change.status === 'pending_approval' && isChangeAdmin && (
                <>
                  <button
                    onClick={() => handleApprove(change.id)}
                    disabled={loading === change.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(change.id)}
                    disabled={loading === change.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}

              {change.status === 'approved' && isChangeTester && (
                <button
                  onClick={() => handleStartTesting(change.id)}
                  disabled={loading === change.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Start Testing
                </button>
              )}

              {change.status === 'in_testing' && isChangeTester && (
                <>
                  <button
                    onClick={() => setShowTestModal(change.id)}
                    disabled={loading === change.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Pass
                  </button>
                  <button
                    onClick={() => {
                      setShowTestModal(change.id);
                    }}
                    disabled={loading === change.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Mark as Fail
                  </button>
                </>
              )}

              {change.status === 'test_passed' && isChangeAdmin && (
                <button
                  onClick={() => handleSchedule(change.id)}
                  disabled={loading === change.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>
              )}

              {change.status === 'scheduled' && isChangeAdmin && (
                <button
                  onClick={() => handleComplete(change.id)}
                  disabled={loading === change.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Change Request</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Test Result</h3>
            <textarea
              value={testNotes}
              onChange={(e) => setTestNotes(e.target.value)}
              placeholder="Please provide test notes..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleTestResult(showTestModal, 'pass')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Pass
              </button>
              <button
                onClick={() => handleTestResult(showTestModal, 'fail')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Fail
              </button>
              <button
                onClick={() => {
                  setShowTestModal(null);
                  setTestNotes('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
