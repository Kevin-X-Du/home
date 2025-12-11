// import axios from "axios";
import fetchJsonp from "fetch-jsonp";

/**
 * Music Player
 */

// 获取音乐播放列表
export const getPlayerList = async (server, type, id) => {
  const res = await fetch(
    `${import.meta.env.VITE_SONG_API}?server=${server}&type=${type}&id=${id}`
  );
  const data = await res.json();

  if (data[0].url.startsWith("@")) {
    // eslint-disable-next-line no-unused-vars
    const [handle, jsonpCallback, jsonpCallbackFunction, url] =
      data[0].url.split("@").slice(1);
    const jsonpData = await fetchJsonp(url).then((res) => res.json());
    const domain = (
      jsonpData.req_0.data.sip.find((i) => !i.startsWith("http://ws")) ||
      jsonpData.req_0.data.sip[0]
    ).replace("http://", "https://");

    return data.map((v, i) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: domain + jsonpData.req_0.data.midurlinfo[i].purl,
      cover: v.cover || v.pic,
      lrc: v.lrc,
    }));
  } else {
    return data.map((v) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: v.url,
      cover: v.cover || v.pic,
      lrc: v.lrc,
    }));
  }
};

/**
 * Hitokoto (One Sentence)
 */

// 获取一言数据
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * Weather
 *
 * Keep all your original Amap weather API functions.
 */

// 获取高德地理位置信息
export const getAdcode = async (key) => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${key}`);
  return await res.json();
};

// 获取高德地理天气信息
export const getWeather = async (key, city) => {
  const res = await fetch(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${key}&city=${city}`
  );
  return await res.json();
};

// 获取教书先生天气 API
// https://api.oioweb.cn/doc/weather/GetWeather
export const getOtherWeather = async () => {
  const res = await fetch("https://api.oioweb.cn/api/weather/GetWeather");
  return await res.json();
};

/**
 * ================================
 * Open-Meteo Weather Mode (New)
 * Using iplocate.io for IP -> Lat/Lon
 * ================================
 */

// 使用 iplocate.io 获取经纬度
export const getLocationByIP = async () => {
  try {
    const res = await fetch("https://www.iplocate.io/api/lookup/");
    const data = await res.json();

    if (data && data.latitude && data.longitude) {
      return {
        status: "success",
        city: data.city,
        country: data.country,
        lat: data.latitude,
        lon: data.longitude,
      };
    }

    return { status: "fail", msg: "iplocate: missing coordinates" };
  } catch (e) {
    return { status: "fail", msg: "iplocate: request failed" };
  }
};

// 获取 Open-Meteo 天气
export const getOpenMeteoWeather = async (lat, lon) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  );
  return await res.json();
};

/**
 * Unified Weather API
 *
 * This function auto-selects weather source based on:
 * VITE_WEATHER_MODE = "amap" or "open-meteo"
 *
 * VITE_WEATHER_KEY is required only in "amap" mode.
 */

export const getWeatherAuto = async () => {
  const mode = import.meta.env.VITE_WEATHER_MODE;
  const key = import.meta.env.VITE_WEATHER_KEY;

  // Open-Meteo mode (no key required)
  if (mode === "open-meteo") {
    const loc = await getLocationByIP();

    if (loc.status !== "success") {
      return { error: true, msg: "Open-Meteo: failed to get IP location" };
    }

    const weather = await getOpenMeteoWeather(loc.lat, loc.lon);

    return {
      mode: "open-meteo",
      city: loc.city,
      country: loc.country,
      ...weather.current_weather,
    };
  }

  // Amap mode (requires key)
  if (mode === "amap") {
    if (!key) {
      return { error: true, msg: "Amap mode requires VITE_WEATHER_KEY" };
    }

    const ad = await getAdcode(key);
    const weather = await getWeather(key, ad.adcode);

    return {
      mode: "amap",
      ...weather.lives?.[0],
    };
  }

  return { error: true, msg: "Unknown weather mode" };
};
