import { createPermissions } from '@/services/permissions';

export const PROFILES = {
  Admin_c: {
    label: 'Admin',
    isDefault: false,
    isPublic: false,
    canManageTeam: true,
    reportsTo: null,
  },
  Student_c: {
    label: 'विद्यार्थी',
    isDefault: true,
    isPublic: false,
    canManageTeam: false,
    reportsTo: 'Admin_c',
  },
};

const TABLE_PERMISSIONS = {
  Admin_c: {
    student_profiles_c: { access: 'Full' },
    study_plans_c: { access: 'Full' },
    study_tasks_c: { access: 'Full' },
    quiz_attempts_c: { access: 'Full' },
    mistake_records_c: { access: 'Full' },
    revision_schedules_c: { access: 'Full' },
    mock_test_attempts_c: { access: 'Full' },
    bookmarks_c: { access: 'Full' },
    study_items_c: { access: 'Full' },
    exam_tracks_c: { access: 'Full' },
    syllabus_topics_c: { access: 'Full' },
    learning_materials_c: { access: 'Full' },
    questions_c: { access: 'Full' },
    mock_tests_c: { access: 'Full' },
    current_affairs_c: { access: 'Full' },
    exam_notifications_c: { access: 'Full' },
    subscription_plans_c: { access: 'Full' },
    subscriptions_c: { access: 'Full' },
    payments_c: { access: 'Full' },
  },
  Student_c: {
    student_profiles_c: { access: 'Read,Create,Update,Delete' },
    study_plans_c: { access: 'Read,Create,Update,Delete' },
    study_tasks_c: { access: 'Read,Create,Update,Delete' },
    quiz_attempts_c: { access: 'Read,Create,Update,Delete' },
    mistake_records_c: { access: 'Read,Create,Update,Delete' },
    revision_schedules_c: { access: 'Read,Create,Update,Delete' },
    mock_test_attempts_c: { access: 'Read,Create,Update,Delete' },
    bookmarks_c: { access: 'Read,Create,Update,Delete' },
    study_items_c: { access: 'Read,Create,Update,Delete' },
    exam_tracks_c: { access: 'Read' },
    syllabus_topics_c: { access: 'Read' },
    learning_materials_c: { access: 'Read' },
    questions_c: { access: 'Read' },
    mock_tests_c: { access: 'Read' },
    current_affairs_c: { access: 'Read' },
    exam_notifications_c: { access: 'Read' },
    subscription_plans_c: { access: 'Read' },
    subscriptions_c: { access: 'Read' },
    payments_c: { access: 'Read' },
  },
};

export const { getProfileMeta, getTableAccess, getFieldAccess } = createPermissions(PROFILES, TABLE_PERMISSIONS);
