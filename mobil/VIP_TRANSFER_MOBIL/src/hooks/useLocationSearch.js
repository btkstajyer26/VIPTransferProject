import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../api/locationApi';

export function useLocationSearch() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const controllerRef = useRef(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  function clearSearch() {
    controllerRef.current?.abort();
    setSuggestions([]);
    setSearchError('');
    setHasSearched(false);
    setLoading(false);
  }

  async function search(query) {
    const normalizedQuery = String(query ?? '').trim();

    if (normalizedQuery.length < 3) {
      setSuggestions([]);
      setHasSearched(false);
      setSearchError('Adres aramak için en az 3 karakter yazın.');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const results = await searchLocations(normalizedQuery, { signal: controller.signal });
      if (controllerRef.current === controller) setSuggestions(results);
    } catch (error) {
      if (error?.name !== 'AbortError' && controllerRef.current === controller) {
        setSuggestions([]);
        setSearchError(error?.message || 'Konumlar yüklenemedi. Tekrar deneyin.');
      }
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }

  return {
    suggestions,
    setSuggestions,
    loading,
    searchError,
    setSearchError,
    hasSearched,
    search,
    clearSearch,
  };
}
