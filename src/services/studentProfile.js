import { sdk } from '@/services/sdk';

export const STUDENT_PROFILE_FIELDS = [
  'Id',
  'Name',
  'target_exam_c',
  'exam_medium_c',
  'district_c',
  'phone_c',
  'daily_goal_minutes_c',
  'onboarding_complete_c',
];

let onboardingDone = false;

export function isOnboardingDone() {
  return onboardingDone;
}

export function markOnboardingDone() {
  onboardingDone = true;
}

export async function fetchStudentProfile() {
  const result = await sdk.table('student_profiles_c').select(STUDENT_PROFILE_FIELDS).orderByDesc('CreatedOn').fetch();
  if (!result.success) throw new Error(result.message || 'प्रोफाइल लोड झाली नाही.');
  const record = result.data?.[0] ?? null;
  onboardingDone = Boolean(record?.onboarding_complete_c);
  return record;
}