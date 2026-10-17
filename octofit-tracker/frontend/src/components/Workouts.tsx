import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title?: string;
  focus?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getJson<{ suggestions?: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com')
      .then((payload) => {
        if (ignore) return;
        setSuggestions(payload.suggestions ?? []);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        setError('Unable to load workout suggestions.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." statusText={loading ? 'Loading workout suggestions...' : undefined}>
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && suggestions.length === 0 ? <p>No workout suggestions</p> : null}
      {!loading && !error && suggestions.length > 0 ? (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title ?? 'workout'}-${index}`}>
              {suggestion.title} ({suggestion.focus}) — {suggestion.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
