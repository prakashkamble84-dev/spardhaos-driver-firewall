export const REVIEW_TASK_TYPE = 'Weak Topic Improvement';

const WEAK_ACCURACY = 60;
const PLAN_DAYS = 5;
const DEFAULT_DAILY_GOAL = 120;

export function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildTopicStats(attempts = [], mistakes = []) {
  const byTopic = new Map();

  const entryFor = (topic) => {
    const key = typeof topic === 'string' ? topic.trim() : '';
    if (!key) return null;
    if (!byTopic.has(key)) {
      byTopic.set(key, { topic: key, subject: '', attempts: 0, correct: 0, openMistakes: 0 });
    }
    return byTopic.get(key);
  };

  attempts.forEach((attempt) => {
    const entry = entryFor(attempt.topic_c);
    if (!entry) return;
    entry.attempts += 1;
    if (attempt.is_correct_c) entry.correct += 1;
  });

  mistakes.forEach((mistake) => {
    if (mistake.review_status_c === 'Resolved') return;
    const entry = entryFor(mistake.topic_c);
    if (!entry) return;
    entry.openMistakes += 1;
    if (!entry.subject && mistake.subject_c) entry.subject = mistake.subject_c;
  });

  return [...byTopic.values()]
    .map((stat) => {
      const accuracy = stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : null;
      const weakness = stat.openMistakes * 2 + (stat.attempts - stat.correct);
      const isWeak = stat.openMistakes > 0 || (accuracy !== null && accuracy < WEAK_ACCURACY);
      return { ...stat, accuracy, weakness, isWeak };
    })
    .sort((a, b) => b.weakness - a.weakness || a.topic.localeCompare(b.topic));
}

export function buildRecommendations({ stats, tasks, attemptCount, today }) {
  const items = [];
  const weak = stats.filter((stat) => stat.isWeak);

  if (!attemptCount && !weak.length) {
    items.push({
      id: 'start',
      title: 'सराव सुरू करा',
      detail: 'अजून सराव चाचणी दिलेली नाही. काही प्रश्न सोडवा, म्हणजे कमकुवत घटक ओळखता येतील.',
    });
  }

  weak.slice(0, 3).forEach((stat) => {
    items.push({
      id: `weak-${stat.topic}`,
      title: stat.topic,
      detail: `${stat.openMistakes} खुल्या चुका${stat.accuracy !== null ? ` · अचूकता ${stat.accuracy}%` : ''}`,
    });
  });

  const overdue = tasks.filter((task) => task.status_c === 'Pending' && task.due_date_c && task.due_date_c < today).length;
  if (overdue) {
    items.push({
      id: 'overdue',
      title: `${overdue} कामे मुदत उलटून गेली`,
      detail: 'ही कामे पूर्ण करा किंवा पुढे ढकला, म्हणजे आराखडा पुन्हा संतुलित राहील.',
    });
  }

  return items;
}

export function buildAdaptivePlan({ weakTopics, existingTasks = [], dailyGoalMinutes, today, planId }) {
  const goal = Number(dailyGoalMinutes) > 0 ? Number(dailyGoalMinutes) : DEFAULT_DAILY_GOAL;
  const scheduled = new Set(
    existingTasks
      .filter((task) => task.status_c === 'Pending' && task.task_type_c === REVIEW_TASK_TYPE && task.topic_c)
      .map((task) => task.topic_c),
  );

  return weakTopics
    .filter((stat) => !scheduled.has(stat.topic))
    .slice(0, PLAN_DAYS)
    .map((stat, index) => ({
      Name: `${stat.topic} सुधारणा सत्र`,
      topic_c: stat.topic,
      ...(stat.subject ? { subject_c: stat.subject } : {}),
      due_date_c: addDays(today, index),
      duration_minutes_c: goal,
      status_c: 'Pending',
      priority_c: index === 0 ? 'High' : 'Medium',
      task_type_c: REVIEW_TASK_TYPE,
      ...(planId ? { study_plan_id_c: String(planId) } : {}),
    }));
}

export function buildCoachQuestion(weakTopics, overdueCount) {
  if (!weakTopics.length) return '';
  const names = weakTopics.slice(0, 5).map((stat) => stat.topic).join(', ');
  const overdueText = overdueCount ? `मुदत उलटलेली कामे: ${overdueCount}. ` : '';
  return `माझे कमकुवत घटक: ${names}. ${overdueText}या घटकांसाठी पुढील 7 दिवसांचा सोपा अभ्यास आराखडा, उजळणीच्या टिप्स आणि एक सराव प्रश्न सोप्या मराठीत द्या.`.slice(0, 1000);
}