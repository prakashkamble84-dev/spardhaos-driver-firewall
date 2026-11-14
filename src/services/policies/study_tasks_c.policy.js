const isAdmin = (user) => Boolean(user && user.profile === 'Admin_c');
const isStudent = (user) => Boolean(user && user.profile === 'Student_c');
const isOwner = (record, user) => String(record.Owner?.Id ?? record.Owner) === String(user.Id);

export const select = (record, user) => Boolean(user) && (isAdmin(user) || (isStudent(user) && isOwner(record, user)));
export const insert = (record, user) => Boolean(user) && (isAdmin(user) || (isStudent(user) && isOwner(record, user)));
export const update = (record, user) => Boolean(user) && (isAdmin(user) || (isStudent(user) && isOwner(record, user)));
export const remove = (record, user) => Boolean(user) && (isAdmin(user) || (isStudent(user) && isOwner(record, user)));
