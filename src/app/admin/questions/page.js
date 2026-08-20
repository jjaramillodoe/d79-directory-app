'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Search,
  Loader2,
  FileText,
  Shield,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  RotateCcw,
  X,
} from 'lucide-react';
import QuestionPreview from '../../../components/admin/QuestionPreview';
import AppFooter from '../../../components/AppFooter';
import { currentSchoolYear } from '../../../lib/schoolYear';

const EMPTY_QUESTION = {
  title: '',
  placeholder: '',
  description: '',
  type: 'textarea',
  required: false,
  question_number: '',
  columns: '',
};

function AdminQuestionsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [data, setData] = useState(null);
  const [selectedStepKey, setSelectedStepKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [requiredFilter, setRequiredFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_QUESTION);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_QUESTION);
  const [addingStep, setAddingStep] = useState(false);
  const [stepTitle, setStepTitle] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishYear, setPublishYear] = useState(currentSchoolYear());

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.level !== 5) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.level === 5) {
      fetchBank();
    }
  }, [session]);

  const fetchBank = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions');
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to load question bank');
      }
      const result = await response.json();
      setData(result);
      const steps = result.draft?.steps || [];
      setSelectedStepKey((current) => current || steps[0]?.key || null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const steps = data?.draft?.steps || [];
  const selectedStep = steps.find((step) => step.key === selectedStepKey) || steps[0];

  const filteredQuestions = useMemo(() => {
    if (!selectedStep) return [];
    const sorted = [...(selectedStep.questions || [])].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      return orderA - orderB;
    });

    return sorted.filter((question) => {
      if (typeFilter !== 'all' && question.type !== typeFilter) return false;
      if (requiredFilter === 'required' && !question.required) return false;
      if (requiredFilter === 'optional' && question.required) return false;
      if (activeFilter === 'active' && question.active === false) return false;
      if (activeFilter === 'inactive' && question.active !== false) return false;
      if (searchTerm) {
        const haystack = `${question.title} ${question.id} ${question.question_number} ${question.description}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [selectedStep, typeFilter, requiredFilter, activeFilter, searchTerm]);

  const applyDraft = (draft) => {
    setData((prev) => ({
      ...prev,
      draft,
      hasUnpublishedChanges: true,
      draftSummary: {
        ...prev?.draftSummary,
        totalQuestions: (draft.steps || []).reduce((sum, step) => sum + (step.questions?.length || 0), 0),
      },
    }));
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepKey: selectedStep.key,
          questionId: editingQuestion.id,
          updates: editForm,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save question');
      applyDraft(result.draft);
      setEditingQuestion(null);
      setNotice('Question updated in the draft. Publish to make it live on forms.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedStep) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepKey: selectedStep.key,
          ...addForm,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add question');
      applyDraft(result.draft);
      setAdding(false);
      setAddForm(EMPTY_QUESTION);
      setNotice(`Added ${result.question.id}. Existing answers were not changed.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!stepTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions/add-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: stepTitle.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add step');
      applyDraft(result.draft);
      setAddingStep(false);
      setStepTitle('');
      setSelectedStepKey(result.step.key);
      setNotice(
        `Added step “${result.step.title}”. Add questions here, then publish to make it live. Existing form answers were not changed.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (question) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepKey: selectedStep.key,
          questionId: question.id,
          updates: { active: question.active === false },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update question');
      applyDraft(result.draft);
      setNotice(
        question.active === false
          ? 'Question reactivated in the draft.'
          : 'Question deactivated. Saved answers stay in place and still display on forms that have them.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (question, direction) => {
    const ordered = [...(selectedStep.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = ordered.findIndex((item) => item.id === question.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
    setSaving(true);
    try {
      const response = await fetch('/api/admin/questions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepKey: selectedStep.key,
          questionIds: swapped.map((item) => item.id),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to reorder');
      applyDraft(result.draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, schoolYear: publishYear || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to publish');
      setShowPublishModal(false);
      setNotice(`Published v${result.published.version}. Existing form answers were not modified.`);
      await fetchBank({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Discard unpublished draft changes and restore the currently published questions?')) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/questions/discard', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to discard draft');
      setNotice('Draft restored from the published question bank.');
      await fetchBank({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (question) => {
    setAdding(false);
    setEditingQuestion(question);
    setEditForm({
      title: question.title || '',
      placeholder: question.placeholder || '',
      description: question.description || '',
      type: question.type || 'textarea',
      required: Boolean(question.required),
      question_number: question.question_number || '',
      columns: Array.isArray(question.columns) ? question.columns.join('\n') : question.columns || '',
      active: question.active !== false,
    });
  };

  if (status === 'loading' || (session?.user?.level === 5 && loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading question bank...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.level !== 5) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-4">
      <div className="max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                Question Bank
              </h1>
              <p className="text-gray-600">
                Edit school plan questions in a draft, then publish. Question IDs and saved answers are never deleted.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md border border-amber-200">
                  <Shield className="w-3 h-3 mr-1" />
                  {session.user.name} (Level {session.user.level})
                </span>
                {data?.published?.version && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md">
                    Published v{data.published.version}
                  </span>
                )}
                {data?.draft?.version && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                    Draft v{data.draft.version}
                  </span>
                )}
                {data?.hasUnpublishedChanges && (
                  <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-md">
                    Unpublished changes
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fetchBank({ silent: true })}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleDiscard}
                disabled={saving || !data?.hasUnpublishedChanges}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 text-sm font-medium rounded-lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard draft
              </button>
              <button
                onClick={() => setShowPublishModal(true)}
                disabled={saving || !data?.hasUnpublishedChanges}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Publish
              </button>
              <Link href="/dashboard">
                <button className="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 mt-0.5" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            ['Questions', data?.draftSummary?.totalQuestions ?? 0],
            ['Required', data?.draftSummary?.requiredQuestions ?? 0],
            ['Optional', data?.draftSummary?.optionalQuestions ?? 0],
            ['Inactive', data?.draftSummary?.inactiveQuestions ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-gray-900">Steps</h2>
                <button
                  onClick={() => {
                    setAdding(false);
                    setEditingQuestion(null);
                    setAddingStep(true);
                    setStepTitle('');
                  }}
                  className="inline-flex items-center px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add step
                </button>
              </div>
              <div className="space-y-1">
                {steps.map((step) => {
                  const count = step.questions?.length || 0;
                  const inactive = (step.questions || []).filter((question) => question.active === false).length;
                  const selected = step.key === selectedStep?.key;
                  return (
                    <button
                      key={step.key}
                      onClick={() => setSelectedStepKey(step.key)}
                      className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
                        selected
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-white border-transparent hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {count} questions{inactive ? ` · ${inactive} inactive` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search title, ID, or number"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="all">All types</option>
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="table">Table</option>
                  <option value="checkbox">Checkbox</option>
                </select>
                <select value={requiredFilter} onChange={(e) => setRequiredFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="all">All required</option>
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                </select>
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setAddingStep(false);
                    setAdding(true);
                    setAddForm(EMPTY_QUESTION);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add question
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{selectedStep?.title || 'Questions'}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredQuestions.length} of {selectedStep?.questions?.length || 0} questions
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Required</th>
                      <th className="px-4 py-3 font-medium">Active</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question, index) => (
                      <tr key={question.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{question.question_number || index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 line-clamp-2">{question.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{question.id}</div>
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-700">{question.type}</td>
                        <td className="px-4 py-3">{question.required ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              question.active === false ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {question.active === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleMove(question, -1)} className="p-2 hover:bg-gray-200 rounded" title="Move up">
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleMove(question, 1)} className="p-2 hover:bg-gray-200 rounded" title="Move down">
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(question)} className="p-2 hover:bg-gray-200 rounded" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(question)}
                              className="p-2 hover:bg-gray-200 rounded"
                              title={question.active === false ? 'Reactivate' : 'Deactivate'}
                            >
                              {question.active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredQuestions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          {selectedStep?.questions?.length
                            ? 'No questions match the current filters.'
                            : 'This step has no questions yet. Add a question, then publish to make it live on forms.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {addingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add a step</h3>
                <p className="text-sm text-gray-600 mt-1">
                  A step is a section of the school plan, like Attendance or Counseling. Add questions after you create it, then publish.
                </p>
              </div>
              <button
                onClick={() => setAddingStep(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Step title
              <input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && stepTitle.trim() && !saving) handleAddStep();
                }}
                placeholder="e.g. School Safety Plan"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              The step key is generated from this title and is not changed later, so existing answers stay intact.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAddingStep(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStep}
                disabled={saving || !stepTitle.trim()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add to draft
              </button>
            </div>
          </div>
        </div>
      )}

      {(editingQuestion || adding) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-xl h-full bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{adding ? 'Add question' : 'Edit question'}</h3>
                {editingQuestion && <p className="text-xs text-gray-500 mt-1">ID: {editingQuestion.id} (cannot be changed)</p>}
              </div>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setAdding(false);
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <QuestionFields
                value={adding ? addForm : editForm}
                onChange={adding ? setAddForm : setEditForm}
              />
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Preview</h4>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800 mb-2 whitespace-pre-line">
                    {(adding ? addForm : editForm).title || 'Question title'}
                  </p>
                  {(adding ? addForm : editForm).description && (
                    <p className="text-xs text-gray-600 mb-3 whitespace-pre-line">
                      {(adding ? addForm : editForm).description}
                    </p>
                  )}
                  <QuestionPreview question={adding ? addForm : editForm} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={adding ? handleAddQuestion : handleSaveQuestion}
                  disabled={saving}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {adding ? 'Add to draft' : 'Save to draft'}
                </button>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setAdding(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Publish question bank?</h3>
            <p className="text-gray-600 mb-4">
              This updates the live form questions. Existing answers stay under their original question IDs. Pin the published set to a school year so last year’s forms keep last year’s questions.
            </p>
            <label className="block text-sm text-gray-700 mb-4">
              Pin to school year
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={publishYear}
                onChange={(e) => setPublishYear(e.target.value)}
                placeholder="2026-2027 (optional)"
              />
            </label>
            <ul className="text-sm text-gray-700 list-disc pl-5 mb-6 space-y-1">
              <li>Copy, required flags, and new questions go live</li>
              <li>Deactivated questions remain in the bank so old answers still display</li>
              <li>This action is written to the audit log</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Confirm publish
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      <AppFooter />
    </div>
  );
}

function QuestionFields({ value, onChange }) {
  const update = (field, next) => onChange({ ...value, [field]: next });

  return (
    <>
      <label className="block text-sm font-medium text-gray-700">
        Question number
        <input
          value={value.question_number}
          onChange={(e) => update('question_number', e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Title
        <textarea
          value={value.title}
          onChange={(e) => update('title', e.target.value)}
          rows={4}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Description
        <textarea
          value={value.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Placeholder
        <textarea
          value={value.placeholder}
          onChange={(e) => update('placeholder', e.target.value)}
          rows={2}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Type
        <select
          value={value.type}
          onChange={(e) => update('type', e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="text">Text</option>
          <option value="textarea">Textarea</option>
          <option value="table">Table (Excel paste)</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </label>
      {value.type === 'table' && (
        <label className="block text-sm font-medium text-gray-700">
          Column headers (optional)
          <textarea
            value={value.columns || ''}
            onChange={(e) => update('columns', e.target.value)}
            rows={4}
            placeholder={'First Name\nLast Name\nTitle\nEmail\nPhone\nCertified\nTraining Date'}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            One per line or comma-separated. Leave blank so staff can paste their own Excel headers.
          </span>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(value.required)}
          onChange={(e) => update('required', e.target.checked)}
        />
        Required
      </label>
    </>
  );
}

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminQuestionsPageContent />
    </Suspense>
  );
}
