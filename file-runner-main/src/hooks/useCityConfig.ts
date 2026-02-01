import { useMemo, useState, useEffect } from 'react';
import { normalizeCityParam, getCityConfig, type CityConfig } from '@/lib/cityConfig';

// Read city param from URL - works with both:
// - Regular query params: ?city=santa-barbara (before hash)
// - HashRouter query params: /#/?city=santa-barbara (after hash)
export function useCityConfig(): CityConfig {
  const [cityConfig, setCityConfig] = useState<CityConfig>(() => {
    return getCityConfigFromURL();
  });

  useEffect(() => {
    // Update on hash change (for HashRouter navigation)
    const handleHashChange = () => {
      setCityConfig(getCityConfigFromURL());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return cityConfig;
}

function getCityConfigFromURL(): CityConfig {
  // Try query params from main URL first (before hash)
  // e.g., https://example.com/price/?city=santa-barbara#/
  const mainUrlParams = new URLSearchParams(window.location.search);
  let cityParam = mainUrlParams.get('city');

  // If not found, try query params after the hash
  // e.g., https://example.com/price/#/?city=santa-barbara
  if (!cityParam && window.location.hash) {
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      cityParam = hashParams.get('city');
    }
  }

  // Sanitize: decode URL encoding, remove trailing slashes, trim whitespace
  if (cityParam) {
    try {
      cityParam = decodeURIComponent(cityParam);
    } catch { /* ignore decode errors */ }
    cityParam = cityParam.replace(/\/+$/, '').trim();
  }

  const cityKey = normalizeCityParam(cityParam);
  return getCityConfig(cityKey);
}
