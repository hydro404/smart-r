import type { WeatherObservation } from "../types";

const CACHE_KEY = "smart-r:weather:v1";
const ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=13.18669&longitude=123.659158&current=precipitation&hourly=precipitation&forecast_days=1&timezone=Asia%2FManila";

function readCache(): WeatherObservation | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as WeatherObservation;
    return { ...parsed, source: "cache" };
  } catch {
    return null;
  }
}

export async function fetchCamaligWeather(signal?: AbortSignal): Promise<WeatherObservation> {
  try {
    const response = await fetch(ENDPOINT, { signal });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const json = await response.json();
    if (!json.current || !Array.isArray(json.hourly?.time) || !Array.isArray(json.hourly?.precipitation)) {
      throw new Error("Weather response is incomplete");
    }
    const currentIndex = Math.max(
      0,
      json.hourly.time.findIndex((time: string) => time >= json.current.time),
    );
    const nextSix = json.hourly.precipitation.slice(currentIndex, currentIndex + 6);
    const observation: WeatherObservation = {
      currentPrecipitationMm: Number(json.current.precipitation) || 0,
      sixHourForecastMm: nextSix.reduce((sum: number, value: number) => sum + (Number(value) || 0), 0),
      observedAt: json.current.time,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(observation));
    return observation;
  } catch (error) {
    const cached = readCache();
    if (cached) return cached;
    throw error;
  }
}
