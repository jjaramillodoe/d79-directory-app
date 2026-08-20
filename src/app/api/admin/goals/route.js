import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
const { authOptions } = require('../../../../lib/auth');
const connectDB = require('../../../../lib/mongodb');
const FormSubmission = require('../../../../models/FormSubmission');
const { getPublishedOrJson } = require('../../../../lib/questionBank');

// NLP patterns to detect N/A responses
const NA_PATTERNS = [
  /^n\/a$/i,
  /^na$/i,
  /^not applicable$/i,
  /^does not apply$/i,
  /^not applicable\.?$/i,
  /^n\.?a\.?$/i,
  /^doesn't apply$/i,
  /^not relevant$/i,
  /^not required$/i,
  /^none$/i,
  /^n\/a\.?$/i,
  /^not available$/i,
  /^not needed$/i,
  /^skip$/i,
  /^not used$/i,
  /^not applicable for this school$/i,
  /^does not apply to our school$/i,
  /^not applicable to our school$/i,
];

// Helper function to check if a value indicates N/A
function isNAValue(value) {
  if (!value) return true; // Empty/null/undefined
  
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'undefined') return true;
  
  // Check against patterns
  return NA_PATTERNS.some(pattern => pattern.test(str));
}

// K-means clustering implementation
function kMeansClustering(data, k, maxIterations = 100) {
  if (data.length === 0 || k <= 0) return { clusters: [], centroids: [] };
  if (data.length <= k) {
    // Each point is its own cluster
    return {
      clusters: data.map((point, idx) => ({ clusterId: idx, points: [point] })),
      centroids: data
    };
  }

  // Initialize centroids randomly
  const centroids = [];
  const usedIndices = new Set();
  for (let i = 0; i < k; i++) {
    let idx;
    do {
      idx = Math.floor(Math.random() * data.length);
    } while (usedIndices.has(idx));
    usedIndices.add(idx);
    centroids.push([...data[idx].features]);
  }

  let clusters = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    // Assign points to nearest centroid
    clusters = Array(k).fill(null).map(() => ({ clusterId: 0, points: [] }));
    
    data.forEach(point => {
      let minDist = Infinity;
      let nearestCluster = 0;
      
      centroids.forEach((centroid, idx) => {
        const dist = euclideanDistance(point.features, centroid);
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = idx;
        }
      });
      
      clusters[nearestCluster].clusterId = nearestCluster;
      clusters[nearestCluster].points.push(point);
    });

    // Update centroids
    let changed = false;
    centroids.forEach((centroid, idx) => {
      if (clusters[idx].points.length === 0) return;
      
      const newCentroid = clusters[idx].points[0].features.map((_, dim) => {
        const sum = clusters[idx].points.reduce((acc, p) => acc + p.features[dim], 0);
        return sum / clusters[idx].points.length;
      });
      
      if (euclideanDistance(centroid, newCentroid) > 0.001) {
        changed = true;
      }
      
      centroids[idx] = newCentroid;
    });

    if (!changed) break;
    iterations++;
  }

  return { clusters, centroids };
}

// Euclidean distance
function euclideanDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Perform clustering analysis
function performClustering(formAnalyses, questionStatistics, questions) {
  // 1. Cluster forms by N/A patterns
  const formClusters = clusterForms(formAnalyses, questions);
  
  // 2. Cluster questions by response patterns
  const questionClusters = clusterQuestions(questionStatistics);
  
  // 3. Cluster schools by completion patterns
  const schoolClusters = clusterSchools(formAnalyses);

  return {
    forms: formClusters,
    questions: questionClusters,
    schools: schoolClusters
  };
}

// Cluster forms based on N/A patterns
function clusterForms(formAnalyses, questions) {
  if (formAnalyses.length === 0) return { clusters: [], optimalK: 0 };
  
  // Create feature vectors: [completionRate, naRate, emptyRate, stepProgress]
  const formFeatures = formAnalyses.map(form => ({
    formId: form.formId,
    schoolName: form.schoolName,
    features: [
      (form.answeredQuestions / form.totalQuestions) * 100, // completion rate
      (form.naQuestions / form.totalQuestions) * 100, // N/A rate
      (form.emptyQuestions / form.totalQuestions) * 100, // empty rate
      (form.completedSteps.length / 15) * 100 // step progress
    ]
  }));

  // Determine optimal k (between 2 and 5, or forms.length if smaller)
  const optimalK = Math.min(5, Math.max(2, Math.floor(Math.sqrt(formAnalyses.length / 2))));
  
  const { clusters, centroids } = kMeansClustering(formFeatures, optimalK);
  
  return {
    clusters: clusters.map((cluster, idx) => ({
      clusterId: idx,
      centroid: centroids[idx],
      formCount: cluster.points.length,
      forms: cluster.points.map(p => ({
        formId: p.formId,
        schoolName: p.schoolName,
        completionRate: p.features[0].toFixed(2),
        naRate: p.features[1].toFixed(2),
        emptyRate: p.features[2].toFixed(2),
        stepProgress: p.features[3].toFixed(2)
      })),
      avgCompletionRate: (cluster.points.reduce((sum, p) => sum + p.features[0], 0) / cluster.points.length).toFixed(2),
      avgNARate: (cluster.points.reduce((sum, p) => sum + p.features[1], 0) / cluster.points.length).toFixed(2)
    })),
    optimalK
  };
}

// Cluster questions by response patterns
function clusterQuestions(questionStatistics) {
  if (questionStatistics.length === 0) return { clusters: [], optimalK: 0 };
  
  // Create feature vectors: [naPercentage, answerPercentage, emptyPercentage]
  const questionFeatures = questionStatistics.map(q => ({
    questionId: q.questionId,
    title: q.title,
    stepTitle: q.stepTitle,
    features: [
      parseFloat(q.naPercentage),
      parseFloat(q.answerPercentage),
      parseFloat(q.emptyPercentage)
    ]
  }));

  const optimalK = Math.min(4, Math.max(2, Math.floor(Math.sqrt(questionStatistics.length / 2))));
  const { clusters, centroids } = kMeansClustering(questionFeatures, optimalK);
  
  return {
    clusters: clusters.map((cluster, idx) => ({
      clusterId: idx,
      centroid: centroids[idx],
      questionCount: cluster.points.length,
      questions: cluster.points.map(p => ({
        questionId: p.questionId,
        title: p.title,
        stepTitle: p.stepTitle,
        naPercentage: p.features[0].toFixed(2),
        answerPercentage: p.features[1].toFixed(2),
        emptyPercentage: p.features[2].toFixed(2)
      })),
      avgNAPercentage: (cluster.points.reduce((sum, p) => sum + p.features[0], 0) / cluster.points.length).toFixed(2),
      avgAnswerPercentage: (cluster.points.reduce((sum, p) => sum + p.features[1], 0) / cluster.points.length).toFixed(2)
    })),
    optimalK
  };
}

// Cluster schools by completion patterns
function clusterSchools(formAnalyses) {
  if (formAnalyses.length === 0) return { clusters: [], optimalK: 0 };
  
  // Group by school
  const schoolData = {};
  formAnalyses.forEach(form => {
    if (!schoolData[form.schoolName]) {
      schoolData[form.schoolName] = {
        schoolName: form.schoolName,
        forms: [],
        totalForms: 0,
        totalAnswered: 0,
        totalNA: 0,
        totalEmpty: 0,
        totalQuestions: 0
      };
    }
    schoolData[form.schoolName].forms.push(form);
    schoolData[form.schoolName].totalForms++;
    schoolData[form.schoolName].totalAnswered += form.answeredQuestions;
    schoolData[form.schoolName].totalNA += form.naQuestions;
    schoolData[form.schoolName].totalEmpty += form.emptyQuestions;
    schoolData[form.schoolName].totalQuestions += form.totalQuestions;
  });

  // Create feature vectors for schools
  const schoolFeatures = Object.values(schoolData).map(school => ({
    schoolName: school.schoolName,
    formCount: school.totalForms,
    features: [
      (school.totalAnswered / school.totalQuestions) * 100, // avg completion
      (school.totalNA / school.totalQuestions) * 100, // avg N/A rate
      school.totalForms // number of forms
    ]
  }));

  const optimalK = Math.min(4, Math.max(2, Math.floor(Math.sqrt(schoolFeatures.length / 2))));
  const { clusters, centroids } = kMeansClustering(schoolFeatures, optimalK);
  
  return {
    clusters: clusters.map((cluster, idx) => ({
      clusterId: idx,
      centroid: centroids[idx],
      schoolCount: cluster.points.length,
      schools: cluster.points.map(p => ({
        schoolName: p.schoolName,
        formCount: p.formCount,
        avgCompletion: p.features[0].toFixed(2),
        avgNARate: p.features[1].toFixed(2)
      })),
      avgCompletion: (cluster.points.reduce((sum, p) => sum + p.features[0], 0) / cluster.points.length).toFixed(2),
      avgNARate: (cluster.points.reduce((sum, p) => sum + p.features[1], 0) / cluster.points.length).toFixed(2)
    })),
    optimalK
  };
}

// Prepare chart data
function prepareChartData(formAnalyses, questionStatistics, questions) {
  // Status distribution pie chart
  const statusDistribution = formAnalyses.reduce((acc, form) => {
    acc[form.status] = (acc[form.status] || 0) + 1;
    return acc;
  }, {});

  // Step completion rates
  const stepCompletion = {};
  formAnalyses.forEach(form => {
    form.completedSteps.forEach(step => {
      stepCompletion[step] = (stepCompletion[step] || 0) + 1;
    });
  });

  // N/A questions by step
  const naByStep = {};
  questionStatistics.forEach(q => {
    if (!naByStep[q.stepTitle]) {
      naByStep[q.stepTitle] = { total: 0, na: 0 };
    }
    naByStep[q.stepTitle].total += q.totalResponses;
    naByStep[q.stepTitle].na += q.naCount;
  });

  // Time-based trends (if we have dates)
  const trendsByDate = {};
  formAnalyses.forEach(form => {
    if (form.updatedAt) {
      const date = new Date(form.updatedAt).toISOString().split('T')[0];
      if (!trendsByDate[date]) {
        trendsByDate[date] = { forms: 0, avgCompletion: 0, totalCompletion: 0 };
      }
      trendsByDate[date].forms++;
      trendsByDate[date].totalCompletion += (form.answeredQuestions / form.totalQuestions) * 100;
    }
  });

  return {
    statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({
      name: status,
      value: count
    })),
    stepCompletion: Object.entries(stepCompletion).map(([step, count]) => ({
      step: `Step ${step}`,
      count: count,
      percentage: ((count / formAnalyses.length) * 100).toFixed(2)
    })),
    naByStep: Object.entries(naByStep).map(([step, data]) => ({
      step: step,
      naCount: data.na,
      totalCount: data.total,
      naPercentage: data.total > 0 ? ((data.na / data.total) * 100).toFixed(2) : 0
    })),
    trends: Object.entries(trendsByDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: date,
        forms: data.forms,
        avgCompletion: (data.totalCompletion / data.forms).toFixed(2)
      })),
    questionStatusDistribution: {
      answered: questionStatistics.reduce((sum, q) => sum + q.answeredCount, 0),
      na: questionStatistics.reduce((sum, q) => sum + q.naCount, 0),
      empty: questionStatistics.reduce((sum, q) => sum + q.emptyCount, 0)
    }
  };
}

// Extract all questions from form structure
function getAllQuestions(formQuestions) {
  const questions = [];
  if (!formQuestions || !formQuestions.steps) {
    return questions;
  }
  formQuestions.steps.forEach(step => {
    step.questions.forEach(q => {
      questions.push({
        id: q.id,
        questionNumber: q.question_number,
        title: q.title,
        stepId: step.id,
        stepKey: step.key,
        stepTitle: step.title,
        required: q.required || false,
        type: q.type || 'text'
      });
    });
  });
  return questions;
}

// Analyze a single form's data
function analyzeFormData(formData, questions) {
  const analysis = {
    totalQuestions: questions.length,
    answeredQuestions: 0,
    naQuestions: 0,
    emptyQuestions: 0,
    questionDetails: []
  };

  questions.forEach(question => {
    const stepData = formData[question.stepKey];
    if (!stepData || !stepData.data) {
      analysis.emptyQuestions++;
      analysis.questionDetails.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        stepTitle: question.stepTitle,
        status: 'empty',
        value: null
      });
      return;
    }

    // Get the value from form data
    // Form data structure: formData[stepKey].data[questionId]
    let value = null;
    const data = stepData.data || {};
    
    // Primary: Try exact question ID match
    if (data[question.id] !== undefined && data[question.id] !== null && data[question.id] !== '') {
      value = data[question.id];
    } 
    // Secondary: Try case-insensitive match
    else {
      const keys = Object.keys(data);
      const matchingKey = keys.find(key => 
        key.toLowerCase() === question.id.toLowerCase() ||
        key.toLowerCase().replace(/[^a-z0-9]/g, '') === question.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (matchingKey && data[matchingKey] !== undefined && data[matchingKey] !== null && data[matchingKey] !== '') {
        value = data[matchingKey];
      }
    }

    // If value is an object/array, convert to string for analysis
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value = value.length > 0 ? value.join(', ') : '';
      } else {
        value = JSON.stringify(value);
      }
    }

    const isNA = isNAValue(value);
    const isEmpty = !value || String(value).trim() === '';

    if (isNA) {
      analysis.naQuestions++;
      analysis.questionDetails.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        stepTitle: question.stepTitle,
        status: 'na',
        value: String(value || '').substring(0, 100), // Truncate for storage
        required: question.required
      });
    } else if (isEmpty) {
      analysis.emptyQuestions++;
      analysis.questionDetails.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        stepTitle: question.stepTitle,
        status: 'empty',
        value: null,
        required: question.required
      });
    } else {
      analysis.answeredQuestions++;
      analysis.questionDetails.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        stepTitle: question.stepTitle,
        status: 'answered',
        value: String(value).substring(0, 100), // Truncate
        required: question.required
      });
    }
  });

  return analysis;
}

// GET: Analyze all forms and provide NLP/ML insights
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin (level 5) can access this
    if (session.user.level !== 5) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const schoolYearFilter = searchParams.get('schoolYear') || '';

    // Load form questions
    const formQuestions = await getPublishedOrJson({ schoolYear: schoolYearFilter || undefined });

    // Get all forms
    let forms = await FormSubmission.find({})
      .populate('userId', 'name email schoolName')
      .lean();
    if (schoolYearFilter && schoolYearFilter !== 'all') {
      const { inferSchoolYear } = require('../../../../lib/schoolYear');
      forms = forms.filter((form) => inferSchoolYear(form) === schoolYearFilter);
    }

    const questions = getAllQuestions(formQuestions);
    
    // Analyze each form
    const formAnalyses = forms.map(form => {
      const analysis = analyzeFormData(form.formData || {}, questions);
      return {
        formId: form._id.toString(),
        schoolName: form.schoolName,
        principalName: form.principalName,
        principalEmail: form.principalEmail,
        status: form.status,
        currentStep: form.currentStep,
        completedSteps: form.completedSteps || [],
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        ...analysis
      };
    });

    // Aggregate statistics across all forms
    const totalForms = forms.length;
    const totalQuestions = questions.length;
    
    // Count N/A occurrences per question
    const questionNAStats = {};
    const questionAnswerStats = {};
    const questionEmptyStats = {};
    
    questions.forEach(q => {
      questionNAStats[q.id] = 0;
      questionAnswerStats[q.id] = 0;
      questionEmptyStats[q.id] = 0;
    });

    formAnalyses.forEach(analysis => {
      analysis.questionDetails.forEach(detail => {
        if (detail.status === 'na') {
          questionNAStats[detail.questionId] = (questionNAStats[detail.questionId] || 0) + 1;
        } else if (detail.status === 'answered') {
          questionAnswerStats[detail.questionId] = (questionAnswerStats[detail.questionId] || 0) + 1;
        } else if (detail.status === 'empty') {
          questionEmptyStats[detail.questionId] = (questionEmptyStats[detail.questionId] || 0) + 1;
        }
      });
    });

    // Build question-level statistics
    const questionStatistics = questions.map(q => {
      const naCount = questionNAStats[q.id] || 0;
      const answeredCount = questionAnswerStats[q.id] || 0;
      const emptyCount = questionEmptyStats[q.id] || 0;
      const totalResponses = naCount + answeredCount + emptyCount;
      
      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        title: q.title,
        stepId: q.stepId,
        stepKey: q.stepKey,
        stepTitle: q.stepTitle,
        required: q.required,
        type: q.type,
        naCount,
        answeredCount,
        emptyCount,
        totalResponses,
        naPercentage: totalResponses > 0 ? ((naCount / totalResponses) * 100).toFixed(2) : 0,
        answerPercentage: totalResponses > 0 ? ((answeredCount / totalResponses) * 100).toFixed(2) : 0,
        emptyPercentage: totalResponses > 0 ? ((emptyCount / totalResponses) * 100).toFixed(2) : 0
      };
    });

    // Overall statistics
    const overallStats = {
      totalForms,
      totalQuestions,
      totalFormQuestions: totalForms * totalQuestions,
      averageCompletionRate: formAnalyses.length > 0
        ? (formAnalyses.reduce((sum, f) => sum + f.answeredQuestions, 0) / (formAnalyses.length * totalQuestions) * 100).toFixed(2)
        : 0,
      averageNARate: formAnalyses.length > 0
        ? (formAnalyses.reduce((sum, f) => sum + f.naQuestions, 0) / (formAnalyses.length * totalQuestions) * 100).toFixed(2)
        : 0,
      averageEmptyRate: formAnalyses.length > 0
        ? (formAnalyses.reduce((sum, f) => sum + f.emptyQuestions, 0) / (formAnalyses.length * totalQuestions) * 100).toFixed(2)
        : 0
    };

    // Top N/A questions (sorted by N/A count)
    const topNAQuestions = questionStatistics
      .filter(q => q.naCount > 0)
      .sort((a, b) => b.naCount - a.naCount)
      .slice(0, 50);

    // Questions with highest N/A percentage
    const highestNAPercentage = questionStatistics
      .filter(q => q.totalResponses >= 3) // At least 3 responses to be meaningful
      .sort((a, b) => parseFloat(b.naPercentage) - parseFloat(a.naPercentage))
      .slice(0, 50);

    // Clustering Analysis
    const clusteringResults = performClustering(formAnalyses, questionStatistics, questions);

    // Chart Data Preparation
    const chartData = prepareChartData(formAnalyses, questionStatistics, questions);

    return NextResponse.json({
      success: true,
      overallStats,
      questionStatistics,
      topNAQuestions,
      highestNAPercentage,
      clustering: clusteringResults,
      chartData: chartData,
      formAnalyses: formAnalyses.slice(0, 100), // Limit to first 100 for response size
      totalFormsAnalyzed: formAnalyses.length,
      schoolYear: schoolYearFilter || 'all',
    });

  } catch (error) {
    console.error('Error analyzing forms:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

