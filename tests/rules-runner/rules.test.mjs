import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

const projectId = 'demo-leloi-firestore-rules';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { rules: readFileSync('../firestore.rules', 'utf8') }
});
after(async () => { await env.cleanup(); });

const guest = env.unauthenticatedContext().firestore();
const admin = env.authenticatedContext('admin-uid').firestore();
const other = env.authenticatedContext('other-uid').firestore();
const viewer = env.authenticatedContext('viewer-uid').firestore();

await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'userRoles/admin-uid'), { role: 'super_admin' });
  await setDoc(doc(db, 'userRoles/viewer-uid'), { role: 'viewer' });
  await setDoc(doc(db, 'siteData/publicContent'), { payload: '{}' });
  await setDoc(doc(db, 'siteData/privateStudents'), { payload: '{"students":[]}' });
  await setDoc(doc(db, 'admissions/existing'), { parentName: 'Parent A', phone: '0123456789', childName: 'Child A', submittedAt: '2026-10-18', status: 'pending' });
  await setDoc(doc(db, 'feedback/existing'), { fullName: 'Parent A', phone: '0123456789', message: 'Hello', submittedAt: '2026-10-18', status: 'pending' });
});

test('Public content readable, private students blocked to guest', async () => {
  await assertSucceeds(getDoc(doc(guest, 'siteData/publicContent')));
  await assertFails(getDoc(doc(guest, 'siteData/privateStudents')));
  await assertSucceeds(getDoc(doc(admin, 'siteData/privateStudents')));
});

test('Guest cannot read admissions or feedback', async () => {
  await assertFails(getDoc(doc(guest, 'admissions/existing')));
  await assertFails(getDoc(doc(guest, 'feedback/existing')));
  await assertSucceeds(getDoc(doc(admin, 'admissions/existing')));
  await assertSucceeds(getDoc(doc(viewer, 'feedback/existing')));
});

test('Roles: own get allowed, cross-user denied, self-escalation denied', async () => {
  await assertSucceeds(getDoc(doc(admin, 'userRoles/admin-uid')));
  await assertSucceeds(getDoc(doc(other, 'userRoles/other-uid')));
  await assertFails(getDoc(doc(guest, 'userRoles/admin-uid')));
  await assertFails(getDoc(doc(other, 'userRoles/admin-uid')));
  await assertFails(setDoc(doc(other, 'userRoles/other-uid'), { role: 'super_admin' }));
  await assertSucceeds(setDoc(doc(admin, 'userRoles/other-uid'), { role: 'viewer' }));
});

test('Guest can submit valid admissions and feedback, cannot create invalid status', async () => {
  await assertSucceeds(setDoc(doc(guest, 'admissions/valid-submission'), {
    parentName: 'Parent A', phone: '0123456789', childName: 'Child A', submittedAt: '2026-10-18T10:00:00Z', status: 'pending'
  }));
  await assertSucceeds(setDoc(doc(guest, 'feedback/valid-submission'), {
    fullName: 'Parent A', phone: '0123456789', message: 'Good suggestion', submittedAt: '2026-10-18T10:00:00Z', status: 'pending'
  }));
  await assertFails(setDoc(doc(guest, 'admissions/bad-submission'), {
    parentName: 'Parent A', phone: '0123456789', childName: 'Child A', submittedAt: '2026-10-18', status: 'contacted'
  }));
});

test('Only privileged accounts can update and delete submitted data', async () => {
  await assertFails(updateDoc(doc(guest, 'admissions/existing'), { status: 'contacted' }));
  await assertFails(deleteDoc(doc(guest, 'feedback/existing')));
  await assertFails(deleteDoc(doc(viewer, 'feedback/existing')));
  await assertSucceeds(updateDoc(doc(admin, 'admissions/existing'), { status: 'contacted' }));
  await assertSucceeds(deleteDoc(doc(admin, 'feedback/existing')));
});
