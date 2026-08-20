function canManageTarget(actor, target) {
  if (!actor || !target) return false;

  const actorId = String(actor.id || actor._id || '');
  const targetId = String(target._id || target.id || '');
  if (actorId && targetId && actorId === targetId) return false;

  const actorEmail = String(actor.email || '').toLowerCase();
  const targetEmail = String(target.email || '').toLowerCase();
  if (actorEmail && targetEmail && actorEmail === targetEmail) return false;

  if (Number(target.level) >= Number(actor.level)) return false;
  if (Number(actor.level) < 5 && target.schoolName !== actor.schoolName) return false;
  if (Number(actor.level) < 5 && Number(target.level) > 3) return false;
  return true;
}

function schoolUserListFilter(actor) {
  if (Number(actor.level) >= 5) return {};
  return {
    schoolName: actor.schoolName,
    level: { $lt: 5 },
  };
}

module.exports = { canManageTarget, schoolUserListFilter };
