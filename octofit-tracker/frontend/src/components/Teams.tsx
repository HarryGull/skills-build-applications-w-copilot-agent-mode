import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name?: string;
  members?: Array<string | { toString?: () => string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getJson<{ teams?: TeamRecord[] }>('/api/teams')
      .then((payload) => {
        if (ignore) return;
        setTeams(payload.teams ?? []);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        setError('Unable to load teams.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." statusText={loading ? 'Loading teams...' : undefined}>
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && teams.length === 0 ? <p>No teams</p> : null}
      {!loading && !error && teams.length > 0 ? (
        <ul>
          {teams.map((team, index) => (
            <li key={`${team.name ?? 'team'}-${index}`}>
              {team.name} ({team.members?.length ?? 0} members)
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
