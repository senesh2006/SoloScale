import { curlFetch } from "./curlFetch";

/**
 * Hosts that need curl.exe on Windows (AV/TLS issues with Node's OpenSSL).
 * Everything else uses native fetch (faster, no 90s curl subprocess cap).
 */
const CURL_HOST_SUFFIXES = [
  "googleapis.com",
  "google.com",
  "gstatic.com",
];

function hostFromInput(input: Parameters<typeof fetch>[0]): string {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return new URL(url).hostname.toLowerCase();
}

export function shouldUseCurlFetch(host: string): boolean {
  return CURL_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * Routes Gemini/Google traffic through curl; ElevenLabs, Pixazo, etc. use
 * native fetch so large audio downloads are not capped at curl --max-time 90.
 */
export function createSmartFetch(nativeFetch: typeof fetch): typeof fetch {
  return (input, init) => {
    const host = hostFromInput(input);
    if (shouldUseCurlFetch(host)) {
      return curlFetch(input, init);
    }
    return nativeFetch(input, init);
  };
}
