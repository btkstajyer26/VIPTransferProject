import { useEffect, useState } from 'react';
import { searchLocations } from '../api/locationApi';

const SEARCH_DELAY_MS = 375;

export function useLocationSearch(location) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    const query = location.displayName.trim();

    if (location.placeId || query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        if (active) setSuggestions(results);
      } catch {
        if (active) setSearchError('Konumlar yüklenemedi. Tekrar deneyin.');
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [location.displayName, location.placeId]);

  return { suggestions, setSuggestions, loading, searchError, setSearchError };
}
