export const select = (record, user) => {
  if (!user) return false;
  return user.profile === 'Admin_c' || (user.profile === 'Student_c' && String(record.Owner?.Id ?? record.Owner) === String(user.Id));
};

export const insert = (record, user) => {
  if (!user) return false;
  return (user.profile === 'Admin_c' && String(record.Owner?.Id ?? record.Owner) === String(user.Id)) || (user.profile === 'Student_c' && String(record.Owner?.Id ?? record.Owner) === String(user.Id));
};

export const update = (record, user) => {
  if (!user) return false;
  return user.profile === 'Admin_c' || (user.profile === 'Student_c' && String(record.Owner?.Id ?? record.Owner) === String(user.Id));
};

export const remove = (record, user) => {
  if (!user) return false;
  return user.profile === 'Admin_c' || (user.profile === 'Student_c' && String(record.Owner?.Id ?? record.Owner) === String(user.Id));
};
