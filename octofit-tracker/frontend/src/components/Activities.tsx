import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  type?: string;
  minutes?: number;
  points?: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getJson<{ activities?: ActivityRecord[] }>('/api/activities')
      .then((payload) => {
        if (ignore) return;
        setActivities(payload.activities ?? []);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        setError('Unable to load activities.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." statusText={loading ? 'Loading activities...' : undefined}>
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && activities.length === 0 ? <p>No activities</p> : null}
      {!loading && !error && activities.length > 0 ? (
        <ul>
          {activities.map((activity, index) => (
            <li key={`${activity.type ?? 'activity'}-${index}`}>
              {activity.type} · {activity.minutes} mins · {activity.points} pts
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
