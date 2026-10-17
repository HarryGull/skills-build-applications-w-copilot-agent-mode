import mongoose, { isValidObjectId } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeObjectId(value: unknown, fieldLabel: string) {
  if (typeof value !== 'string' || !isValidObjectId(value)) {
    throw badRequest(`A valid ${fieldLabel} is required.`);
  }
  return new mongoose.Types.ObjectId(value);
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity data is required.');
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const normalizedUserId = normalizeObjectId(userId, 'userId');
  const normalizedTeamId = normalizeObjectId(teamId, 'teamId');

  if (typeof type !== 'string' || !type.trim()) {
    throw badRequest('Activity type is required.');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Minutes must be a positive number.');
  }

  const user = await User.findById(normalizedUserId);
  const team = await Team.findById(normalizedTeamId);
  if (!user || !team) {
    throw badRequest('User and team references must exist.');
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: Math.max(1, Math.round(minutes)),
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team data is required.');
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('Team name is required.');
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw badRequest('Team mascot is required.');
  }

  const normalizedMembers = Array.isArray(members)
    ? [...new Set(members.map((member) => normalizeObjectId(member, 'team member').toString()))].map((memberId) => new mongoose.Types.ObjectId(memberId))
    : [];

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: normalizedMembers,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const teams = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (!teams.length) {
    return [];
  }

  const teamIds = teams.map((team) => team._id);
  const teamRecords = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamMap = new Map(teamRecords.map((team) => [team._id.toString(), team.name]));

  return teams.map((team, index) => ({
    teamName: teamMap.get(team._id.toString()) ?? 'Unknown team',
    totalPoints: Number(team.totalPoints),
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail?.trim();
  if (!normalizedEmail) {
    throw badRequest('A user email is required.');
  }

  const user = await User.findOne({ email: normalizedEmail.toLowerCase() });
  if (!user) {
    throw Object.assign(new Error('No user found for that email.'), { status: 404 });
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const matchSignals = new Set<string>();
  if (user.fitnessGoal) {
    matchSignals.add(user.fitnessGoal.trim().toLowerCase());
  }
  for (const activity of recentActivity) {
    if (typeof activity.type === 'string' && activity.type.trim()) {
      matchSignals.add(activity.type.trim().toLowerCase());
    }
  }

  const workouts = await Workout.find().sort({ title: 1 }).lean();

  const scored = workouts
    .map((workout) => {
      const focus = typeof workout.focus === 'string' ? workout.focus.toLowerCase() : '';
      let score = 0;
      if (focus && matchSignals.has(focus)) score += 4;
      if (user.fitnessGoal && focus === user.fitnessGoal.trim().toLowerCase()) score += 3;
      if (recentActivity.some((activity) => typeof activity.type === 'string' && activity.type.trim().toLowerCase() === focus)) score += 2;
      return { workout, score };
    })
    .sort((left, right) => right.score - left.score || left.workout.title.localeCompare(right.workout.title));

  if (!scored.length) {
    return [];
  }

  return scored.slice(0, 3).map(({ workout, score }) => ({
    ...workout,
    reason: createWorkoutReason(user, recentActivity, workout, score),
  }));
}

function createWorkoutReason(user: { fitnessGoal?: string | null }, recentActivity: Array<{ type?: string | null }>, workout: { focus?: string | null }, _score: number) {
  const focus = workout.focus?.trim();
  const goal = user.fitnessGoal?.trim();
  const recentType = recentActivity.find((activity) => typeof activity.type === 'string' && activity.type.trim())?.type?.trim();

  if (focus && goal && focus.toLowerCase() === goal.toLowerCase()) {
    return `Matches your ${goal} goal and supports your training pattern.`;
  }
  if (focus && recentType && focus.toLowerCase() === recentType.toLowerCase()) {
    return `Matches your recent ${recentType} activity and builds on the same movement pattern.`;
  }
  if (focus && goal) {
    return `Complements your ${goal} goal and keeps your routine balanced.`;
  }
  return 'Supports your recent activity pattern and keeps training varied.';
}

export { User };
