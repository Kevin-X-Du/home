// import axios from "axios";
import fetchJsonp from "fetch-jsonp";

/**
 * 音乐播放器
 */

// 获取音乐播放列表
export const getPlayerList = async (server, type, id) => {
  const res = await fetch(
    `${import.meta.env.VITE_SONG_API}?server=${server}&type=${type}&id=${id}`,
  );
  const data = await res.json();

  if (data[0].url.startsWith("@")) {
    // eslint-disable-next-line no-unused-vars
    const [handle, jsonpCallback, jsonpCallbackFunction, url] = data[0].url.split("@").slice(1);
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
 * 一言
 */

// 获取一言数据
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * 天气
 *
 * 以下为你原有的功能，全部保留，不删除。
 */

// 获取高德地理位置信息
export const getAdcode = async (key) => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${key}`);
  return await res.json();
};

// 获取高德地理天气信息
export const getWeather = async (key, city) => {
  const res = await fetch(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${key}&city=${city}`,
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
 * 以下为新增：Open-Meteo 天气模式
 * ================================
 * 注意：所有新增内容都不会影响你原有的任何函数，且不删除任何注释。
 */

// Open-Meteo：通过 IP 获取经纬度
export const getLocationByIP = async () => {
  const res = await fetch("https://ip-api.com/json/");
  return await res.json();
};

// Open-Meteo：通过经纬度获取天气信息
export const getOpenMeteoWeather = async (lat, lon) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  );
  return await res.json();
};

/**
 * =========================================
 * 新增统一入口：自动按模式获取天气（推荐使用）
 * =========================================
 *
 * 根据 .env 配置决定使用：
 * - 高德天气（amap）
 * - Open-Meteo（open-meteo）
 *
 * 环境变量：
 * VITE_WEATHER_MODE="amap" 或 "open-meteo"
 * VITE_WEATHER_KEY   = 高德 Key（amap 模式必需）
 */

export const getWeatherAuto = async () => {
  const mode = import.meta.env.VITE_WEATHER_MODE;
  const key = import.meta.env.VITE_WEATHER_KEY;

  // ---------------------------
  // Open-Meteo 模式（无需 Key）
  // ---------------------------
  if (mode === "open-meteo") {
    const loc = await getLocationByIP();

    if (loc.status !== "success") {
      return { error: true, msg: "Open-Meteo：无法获取 IP 地理位置" };
    }

    const weather = await getOpenMeteoWeather(loc.lat, loc.lon);

    return {
      mode: "open-meteo",
      city: loc.city,
      country: loc.country,
      ...weather.current_weather,
    };
  }

  // ---------------------------
  // 高德模式（需要 key）
  // ---------------------------
  if (mode === "amap") {
    if (!key) {
      return { error: true, msg: "高德天气模式需要 VITE_WEATHER_KEY" };
    }

    const ad = await getAdcode(key);
    const weather = await getWeather(key, ad.adcode);

    return {
      mode: "amap",
      ...weather.lives?.[0],
    };
  }

  return { error: true, msg: "未知天气模式，请检查 VITE_WEATHER_MODE" };
};
