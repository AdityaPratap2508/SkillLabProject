import { randomUUID } from 'node:crypto';

const users = new Map();
const analyses = new Map();
const profiles = new Map();

export const demoStore = {
  createUser(user) {
    const email = user.email.toLowerCase();
    if (users.has(email)) return null;
    const stored = { ...user, id: randomUUID(), email };
    users.set(email, stored);
    return stored;
  },
  findUser(email) {
    return users.get(String(email).toLowerCase()) || null;
  },
  getProfile(userId) {
    return profiles.get(userId) || {};
  },
  saveProfile(userId, profile) {
    const stored = { ...profile };
    profiles.set(userId, stored);
    return stored;
  },
  deleteUser(email) {
    const key = String(email).toLowerCase();
    const user = users.get(key);
    if (!user) return false;
    users.delete(key);
    profiles.delete(user.id);
    for (const [analysisId, record] of analyses) {
      if (record.userId === user.id) analyses.delete(analysisId);
    }
    return true;
  },
  saveAnalysis(userId, item) {
    const record = { ...item, id: randomUUID(), userId, createdAt: new Date().toISOString(), saved: true };
    analyses.set(record.id, record);
    return record;
  },
  listAnalyses(userId) {
    return [...analyses.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getAnalysis(userId, analysisId) {
    const record = analyses.get(analysisId);
    return record?.userId === userId ? record : null;
  },
  deleteAnalysis(userId, analysisId) {
    if (!this.getAnalysis(userId, analysisId)) return false;
    analyses.delete(analysisId);
    return true;
  }
};