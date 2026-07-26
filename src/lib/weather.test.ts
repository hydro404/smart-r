import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCamaligWeather } from "./weather";

describe("weather service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("normalizes live precipitation and the next six hours", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: "2026-07-26T10:00", precipitation: 1.2 },
        hourly: {
          time: ["2026-07-26T09:00", "2026-07-26T10:00", "2026-07-26T11:00", "2026-07-26T12:00", "2026-07-26T13:00", "2026-07-26T14:00", "2026-07-26T15:00"],
          precipitation: [0, 1, 2, 3, 4, 5, 6],
        },
      }),
    }));
    const result = await fetchCamaligWeather();
    expect(result.currentPrecipitationMm).toBe(1.2);
    expect(result.sixHourForecastMm).toBe(21);
    expect(result.source).toBe("live");
  });

  it("falls back to the last successful observation", async () => {
    localStorage.setItem("smart-r:weather:v1", JSON.stringify({
      currentPrecipitationMm: 0,
      sixHourForecastMm: 2,
      observedAt: "2026-07-26T10:00",
      fetchedAt: "2026-07-26T10:01:00.000Z",
      source: "live",
    }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await fetchCamaligWeather();
    expect(result.source).toBe("cache");
    expect(result.sixHourForecastMm).toBe(2);
  });
});
