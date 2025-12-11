// import axios from "axios";
import fetchJsonp from "fetch-jsonp";

/**
 * ===========================
 * 音乐播放器（原样）
 * ===========================
 */
export const getPlayerList = async (server, type, id) => {
  const res = await fetch(
    `${import.meta.env.VITE_SONG_API}?server=${server}&type=${type}&id=${id}`
  );
  const data = await res.json();

  if (data[0].url.startsWith("@")) {
    const [_, jsonpCallback, jsonpCallbackFunction, url] =
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
      lrc: v.lrc
    }));
  } else {
    return data.map((v) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: v.url,
      cover: v.cover || v.pic,
      lrc: v.lrc
    }));
  }
};

/**
 * ===========================
 * 一言 API
 * ===========================
 */
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * ===========================
 * Google 翻译（中文 → 英文）
 * 只用于天气查询
 * ===========================
 */
export const translateZhToEn = async (cityName) => {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=zh&tl=en&q=" +
      encodeURIComponent(cityName);

    const res = await fetch(url);
    const data = await res.json();
    const translated = data[0][0][0];

    console.log(`🌐 翻译中文 → 英文：${cityName} → ${translated}`);
    return translated;
  } catch (e) {
    console.warn("⚠️ 翻译失败，使用原名英文:", cityName);
    return cityName;
  }
};

/**
 * ===========================
 * 获取原始 API 中文城市
 * ===========================
 */
export const getRawIPCityName = async () => {
  try {
    const raw = await fetch("https://api.vore.top/api/IPdata").then(
      (r) => r.json()
    );

    if (raw.code !== 200) return null;

    // 最优中文城市选择顺序
    const city =
      raw.adcode?.c?.replace("市", "") ||
      raw.ipdata?.info2?.replace("市", "") ||
      raw.ipdata?.info1;

    console.log("📌 API 中文城市：", city);

    return city;
  } catch (e) {
    console.error("❌ 无法读取中文城市:", e);
    return null;
  }
};

/**
 * ===========================
 * Open-Meteo 城市 → 经纬度
 * ===========================
 */
export const getCityLocation = async (cityNameEn) => {
  try {
    console.log("📍 查询城市坐标（英文）:", cityNameEn);

    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(cityNameEn);

    const res = await fetch(url);
    const data = await res.json();

    if (data?.results?.length > 0) {
      console.log("📌 坐标查询成功：", data.results[0]);
      return data.results[0];
    }

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * ===========================
 * Open-Meteo 天气
 * ===========================
 */
export const getOpenMeteoWeather = async (lat, lon) => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current_weather=true";

  const res = await fetch(url);
  return await res.json();
};

/**
 * ===========================
 * 🌦 主天气接口
 *
 * ✔ 第 1 步：用 API 中文城市
 * ✔ 第 2 步：翻译英文供天气使用
 * ✔ 第 3 步：查天气
 * ✔ 第 4 步：最终城市名恢复中文（API 的）
 *
 * ===========================
 */
export const getWeatherAuto = async () => {
  // STEP 1：API 中文城市
  const zhCity = await getRawIPCityName();
  if (!zhCity) {
    return { error: true, msg: "无法读取中文城市" };
  }

  // STEP 2：将中文翻译成英文 → 用于天气查询
  const enCity = await translateZhToEn(zhCity);

  // STEP 3：查英文城市坐标
  const geo = await getCityLocation(enCity);
  if (!geo) {
    console.error("❌ 坐标解析失败：", enCity);
    return { error: true, msg: "无法解析城市坐标" };
  }

  // STEP 4：查天气
  const weather = await getOpenMeteoWeather(geo.latitude, geo.longitude);

  // STEP 5：最终返回中文城市（来自 API）
  return {
    mode: "open-meteo",
    city: zhCity, // 🔥 最终显示 API 中文城市
    temperature: weather.current_weather.temperature,
    winddirection: weather.current_weather.winddirection,
    windspeed: weather.current_weather.windspeed
  };
};
