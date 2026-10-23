// Stands in for the extension APIs so the real popup code renders in a page.
(() => {
  const host = new URLSearchParams(location.search).get('d') || 'example.com';
  const data = fetch('companies.json').then((r) => r.json());
  Object.defineProperty(window, 'chrome', {
    value: {
      tabs: { query: async () => [{ url: `https://www.${host}/` }] },
      runtime: {
        sendMessage: async () => {
          const d = await data;
          const entry = d.entries[host];
          const base = { hostname: `www.${host}`, matchedDomain: host };
          return {
            verdict: entry ? { ...entry, ...base } : { status: 'unknown', ...base },
            info: {
              entryCount: Object.keys(d.entries).length,
              bundledVersion: d.dataVersion,
              remoteVersion: d.dataVersion,
              fetchedAt: Date.now() - 3 * 3600e3,
              lastError: null
            }
          };
        }
      }
    }
  });
})();
