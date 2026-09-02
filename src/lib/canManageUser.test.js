const test = require('node:test');
const assert = require('node:assert');

const { canManageTarget, canAssignLevel, schoolUserListFilter } = require('./canManageUser');

// This is the policy that decides who may edit or delete another account, so the cases below
// are written as the escalation each one is meant to block rather than as line coverage.

const superAdmin = { id: 'a1', email: 'super@d79.nyc', level: 5, schoolName: 'District Office' };
const schoolAdmin = { id: 'a2', email: 'admin@ps1.nyc', level: 4, schoolName: 'PS 1' };
const principal = { id: 'a3', email: 'principal@ps1.nyc', level: 3, schoolName: 'PS 1' };

test('canManageTarget: missing actor or target denies', () => {
  assert.equal(canManageTarget(null, principal), false);
  assert.equal(canManageTarget(schoolAdmin, null), false);
  assert.equal(canManageTarget(undefined, undefined), false);
});

test('canManageTarget: nobody can manage their own account', () => {
  // Self-management is the classic route to locking yourself out or self-promoting.
  assert.equal(canManageTarget(superAdmin, { ...superAdmin, _id: 'a1' }), false);
  assert.equal(canManageTarget(schoolAdmin, { ...schoolAdmin, _id: 'a2' }), false);
});

test('canManageTarget: self-match by email is caught even when ids differ', () => {
  // Mongo `_id` and session `id` do not always agree in shape, so email is a second guard.
  const sameHumanDifferentId = {
    _id: 'different-id',
    email: 'ADMIN@PS1.NYC',
    level: 2,
    schoolName: 'PS 1',
  };
  assert.equal(canManageTarget(schoolAdmin, sameHumanDifferentId), false);
});

test('canManageTarget: nobody can manage a peer or anyone above them', () => {
  const peer = { _id: 'b1', email: 'peer@ps1.nyc', level: 4, schoolName: 'PS 1' };
  const superior = { _id: 'b2', email: 'boss@d79.nyc', level: 5, schoolName: 'PS 1' };
  assert.equal(canManageTarget(schoolAdmin, peer), false);
  assert.equal(canManageTarget(schoolAdmin, superior), false);
  assert.equal(canManageTarget(principal, { ...peer, level: 3 }), false);
});

test('canManageTarget: below level 5, management is confined to your own school', () => {
  const otherSchoolStaff = { _id: 'c1', email: 's@ps2.nyc', level: 2, schoolName: 'PS 2' };
  assert.equal(canManageTarget(schoolAdmin, otherSchoolStaff), false);

  const ownSchoolStaff = { _id: 'c2', email: 's@ps1.nyc', level: 2, schoolName: 'PS 1' };
  assert.equal(canManageTarget(schoolAdmin, ownSchoolStaff), true);
});

test('canManageTarget: a Super Admin can update every other account, including Super Admins', () => {
  const otherSuper = { _id: 's2', email: 'other@d79.nyc', level: 5, schoolName: 'District Office' };
  const anySchoolStaff = { _id: 'd1', email: 's@ps9.nyc', level: 4, schoolName: 'PS 9' };
  assert.equal(canManageTarget(superAdmin, otherSuper), true);
  assert.equal(canManageTarget(superAdmin, anySchoolStaff), true);
});

test('canManageTarget: the "target above level 3" guard is unreachable defense in depth', () => {
  // `if (actor.level < 5 && target.level > 3) return false` can never be the deciding rule.
  // It only applies when actor.level <= 4, and any target with level > 3 (so >= 4) already
  // satisfies the earlier `target.level >= actor.level` check and returns false there.
  //
  // Asserted rather than deleted because it costs nothing and would start mattering if the
  // rank check above it were ever loosened. The test exists so that if someone does change
  // the ordering, this guard's behavior is pinned rather than discovered in production.
  const levelFourActor = { id: 'e1', email: 'x@ps1.nyc', level: 4, schoolName: 'PS 1' };
  for (const targetLevel of [4, 5, 6]) {
    assert.equal(
      canManageTarget(levelFourActor, {
        _id: 'e2',
        email: 'y@ps1.nyc',
        level: targetLevel,
        schoolName: 'PS 1',
      }),
      false
    );
  }
  // Level 3 and below remain manageable, which is the rule that actually does work.
  assert.equal(
    canManageTarget(levelFourActor, {
      _id: 'e3',
      email: 'z@ps1.nyc',
      level: 3,
      schoolName: 'PS 1',
    }),
    true
  );
});

test('canManageTarget: an actor above level 5 is not school-scoped', () => {
  // Documents actual behavior: the school and level-3 guards are both written as
  // `actor.level < 5`, so a level-6 actor bypasses them exactly as level 5 does.
  const actor = { id: 'g1', email: 'x@d79.nyc', level: 6, schoolName: 'District Office' };
  const otherSchoolFour = { _id: 'g2', email: 'y@ps9.nyc', level: 4, schoolName: 'PS 9' };
  assert.equal(canManageTarget(actor, otherSchoolFour), true);
});

test('canManageTarget: string levels from form input compare numerically', () => {
  // Levels arriving as strings would make '10' < '4' under lexicographic comparison.
  const actor = { id: 'f1', email: 'a@ps1.nyc', level: '4', schoolName: 'PS 1' };
  const target = { _id: 'f2', email: 'b@ps1.nyc', level: '10', schoolName: 'PS 1' };
  assert.equal(canManageTarget(actor, target), false, 'level 10 outranks level 4');
});

test('canAssignLevel: Super Admin may assign levels 1-5', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    assert.equal(canAssignLevel(superAdmin, level), true);
  }
  assert.equal(canAssignLevel(superAdmin, 0), false);
  assert.equal(canAssignLevel(superAdmin, 6), false);
});

test('canAssignLevel: principals may only assign 1-3', () => {
  assert.equal(canAssignLevel(schoolAdmin, 1), true);
  assert.equal(canAssignLevel(schoolAdmin, 3), true);
  assert.equal(canAssignLevel(schoolAdmin, 4), false);
  assert.equal(canAssignLevel(schoolAdmin, 5), false);
});

test('schoolUserListFilter: level 5 sees everyone', () => {
  assert.deepEqual(schoolUserListFilter(superAdmin), {});
  assert.deepEqual(schoolUserListFilter({ level: 6 }), {});
});

test('schoolUserListFilter: below level 5 is scoped to own school and hides level 5', () => {
  assert.deepEqual(schoolUserListFilter(schoolAdmin), {
    schoolName: 'PS 1',
    level: { $lt: 5 },
  });
  assert.deepEqual(schoolUserListFilter(principal), {
    schoolName: 'PS 1',
    level: { $lt: 5 },
  });
});

test('schoolUserListFilter: a missing level is treated as unprivileged', () => {
  // `Number(undefined)` is NaN and `NaN >= 5` is false, so this must fall to the scoped
  // branch rather than returning the unrestricted `{}`.
  const filter = schoolUserListFilter({ schoolName: 'PS 1' });
  assert.deepEqual(filter, { schoolName: 'PS 1', level: { $lt: 5 } });
});
