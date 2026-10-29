import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDemoResume, matchJobDescription } from '../src/services/analysis.js';
import { validateResumeFile, validateResumeText } from '../src/services/resume-parser.js';
import { analysisSchema } from '../src/validators/analysis.js';
import { demoStore } from '../src/demo-store.js';

const sample = `Jamie Rivera\nBSc Computer Science, North Valley University\nProjects\nBuilt a React application using JavaScript, PostgreSQL, REST APIs and Git.\nExperience\nWeb development intern collaborated with a team.`;

test('resume text validation enforces minimum and maximum lengths', () => {
  assert.throws(() => validateResumeText('too short'), /at least 80 characters/);
  assert.equal(validateResumeText(sample).length, sample.length);
  assert.throws(() => validateResumeText('x'.repeat(60001)), /too long/);
});

test('upload validation accepts supported PDF bytes and rejects renamed files', () => {
  const validPdf = { originalname: 'resume.pdf', mimetype: 'application/pdf', size: 12, buffer: Buffer.from('%PDF-1.7 data') };
  assert.equal(validateResumeFile(validPdf), '.pdf');
  assert.throws(() => validateResumeFile({ ...validPdf, originalname: 'resume.exe' }), /PDF or DOCX/);
  assert.throws(() => validateResumeFile({ ...validPdf, buffer: Buffer.from('not-pdf') }), /valid PDF/);
});

test('demo analysis is schema-valid and only reports skills supported by text', () => {
  const result = analyzeDemoResume(sample);
  assert.equal(analysisSchema.safeParse(result).success, true);
  assert.ok(result.skillsAnalysis.skillEvidence.some((skill) => skill.name === 'React' && skill.evidenceType === 'Explicit'));
  assert.ok(!result.skillsAnalysis.skillEvidence.some((skill) => skill.name === 'Python'));
  assert.ok(!result.skillsAnalysis.skillEvidence.some((skill) => ['Java', 'C'].includes(skill.name)));
  assert.ok(result.jobRecommendations.every((role) => role.alignmentScore >= 0 && role.alignmentScore <= 100));
});

test('job description match reports text overlap rather than ATS probability', () => {
  const match = matchJobDescription(sample, 'We need a React developer with JavaScript, Kubernetes, teamwork, and cloud experience.');
  assert.ok(match.matchingSkills.includes('react'));
  assert.ok(match.missingKeywords.includes('kubernetes'));
  assert.ok(match.alignmentScore >= 0 && match.alignmentScore <= 100);
});

test('demo analysis history is private to its owner', () => {
  const firstUser = demoStore.createUser({ name: 'Owner One', email: `owner-${Date.now()}@test.invalid`, password_hash: 'hash' });
  const secondUser = demoStore.createUser({ name: 'Owner Two', email: `other-${Date.now()}@test.invalid`, password_hash: 'hash' });
  const analysis = demoStore.saveAnalysis(firstUser.id, { title: 'Private resume', providerMode: 'demo', result: {} });

  assert.equal(analysis.saved, true);
  assert.equal(demoStore.getAnalysis(firstUser.id, analysis.id).title, 'Private resume');
  assert.equal(demoStore.getAnalysis(firstUser.id, analysis.id).saved, true);
  assert.equal(demoStore.getAnalysis(secondUser.id, analysis.id), null);
  assert.equal(demoStore.deleteAnalysis(secondUser.id, analysis.id), false);
  assert.equal(demoStore.deleteAnalysis(firstUser.id, analysis.id), true);
});
