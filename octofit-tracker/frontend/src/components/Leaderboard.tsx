import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName?: string;
  totalPoints?: number;
  rank?: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getJson<{ leaderboard?: LeaderboardEntry[] }>('/api/leaderboard')
      .then((payload) => {
        if (ignore) return;
        setEntries(payload.leaderboard ?? []);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        setError('Unable to load leaderboard.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." statusText={loading ? 'Loading leaderboard...' : undefined}>
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && entries.length === 0 ? <p>No leaderboard</p> : null}
      {!loading && !error && entries.length > 0 ? (
        <ol>
          {entries.map((entry, index) => (
            <li key={`${entry.teamName ?? 'team'}-${index}`}>
              {entry.teamName} — {entry.totalPoints} pts (Rank {entry.rank})
            </li>
          ))}
        </ol>
      ) : null}
    </CapabilityCard>
  );
}
