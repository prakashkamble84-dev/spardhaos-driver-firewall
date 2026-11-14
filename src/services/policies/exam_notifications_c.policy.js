const isAdmin = (user) => Boolean(user && user.profile === 'Admin_c');
const isStudent = (user) => Boolean(user && user.profile === 'Student_c');

export const select = (record, user) => Boolean(user) && (isAdmin(user) || (isStudent(user) && record.status_c === 'Published'));
export const insert = (record, user) => isAdmin(user) && String(record.Owner?.Id ?? record.Owner) === String(user.Id);
export const update = (record, user) => isAdmin(user);
export const remove = (record, user) => isAdmin(user);
