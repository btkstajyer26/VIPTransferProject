import { useCallback, useEffect, useRef, useState } from 'react';
import { getVehicles } from '../api/vehicleApi';

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const reloadVehicles = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getVehicles();

      if (isMounted.current) {
        setVehicles(Array.isArray(response) ? response : []);
      }
    } catch (requestError) {
      if (isMounted.current) {
        setVehicles([]);
        setError(requestError?.message || 'Araçlar yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    reloadVehicles();
  }, [reloadVehicles]);

  return {
    vehicles,
    loading,
    error,
    reloadVehicles,
  };
}
