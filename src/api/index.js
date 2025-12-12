// import axios from "axios";
import fetchJsonp from "fetch-jsonp";

/**
 * ======================
 * 🎵 音乐播放器
 * ======================
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
 * ======================
 * ✨ 一言 API
 * ======================
 */
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * ======================
 * 🌦 天气系统（保留所有原高德 API）
 * ======================
 */

// 高德 IP 定位（保留原始）
export const getAdcode = async (key) => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${key}`);
  return await res.json();
};

// 高德天气（保留）
export const getWeather = async (key, city) => {
  const res = await fetch(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${key}&city=${city}`
  );
  return await res.json();
};

// 教书先生 API（保留）
export const getOtherWeather = async () => {
  const res = await fetch("https://api.oioweb.cn/api/weather/GetWeather");
  return await res.json();
};

/**
 * ================================
 * 🛰 1. 获取 IP 地理信息（中文城市）
 * ================================
 * 使用 VORE.top — 全球免费 IP 定位
 */
export const getIpInfo = async () => {
  try {
    const res = await fetch("https://api.vore.top/api/IPdata");
    const data = await res.json();
    console.log("📍 IP 定位结果：", data);
    return data;
  } catch (e) {
    console.error("❌ IP API 获取失败", e);
    return null;
  }
};

/**
 * ============================================
 * 🤖 [新增] AI 智能翻译 (辅助 Open-Meteo)
 * ============================================
 * 作用：当 Open-Meteo 无法识别 "朝阳区" 时，
 * 调用 AI 将其翻译为 "Chaoyang District" 以提高成功率
 */
export const translateByAI = async (text) => {
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  // 如果没有配置 Key，直接返回 null，不进行翻译尝试
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct", // 使用免费且快速的模型
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate the input location to English. Output ONLY the translated name, no punctuation.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 20,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    // 简单清洗结果，去掉句号
    return result ? result.replace(/\.$/, "") : null;
  } catch (e) {
    console.warn("⚠️ AI 翻译不可用，跳过:", e);
    return null;
  }
};

/**
 * ======================================
 * 🌍 2. Open-Meteo 地理解析 (增强版)
 * ======================================
 * 策略：
 * 1. 查原名 (中文)
 * 2. 查去掉后缀的名 (如去掉"市"、"区")
 * 3. 查 AI 翻译后的英文名
 */
export const geocodeCity = async (name) => {
  if (!name) return null;

  // 内部辅助 fetch 函数
  const fetchGeo = async (q) => {
    try {
      console.log(`🔍 Geocoding 尝试查询：${q}`);
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&language=zh&count=1`
      );
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        return data.results[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // ⏹️ 策略 1：直接查询 (例如 "北京市")
  let r = await fetchGeo(name);
  if (r) return formatGeoResult(r);

  // ⏹️ 策略 2：去掉行政后缀 (例如 "朝阳区" -> "朝阳")
  // 很多时候 Open-Meteo 存的是简称
  const cleanName = name.replace(/(市|区|县|自治州|地区|街道)$/, "");
  if (cleanName !== name) {
    r = await fetchGeo(cleanName);
    if (r) return formatGeoResult(r);
  }

  // ⏹️ 策略 3：AI 翻译 (例如 "朝阳区" -> "Chaoyang District")
  // 只有配置了 VITE_AI_API_KEY 才会执行这一步
  console.log("🔄 中文匹配失败，尝试 AI 翻译...");
  const enName = await translateByAI(name);
  if (enName) {
    console.log(`🤖 AI 翻译结果：${name} -> ${enName}`);
    r = await fetchGeo(enName);
    if (r) return formatGeoResult(r);
  }

  console.warn("❌ Geocoding 最终未找到：", name);
  return null;
};

// 格式化返回结果的辅助函数
const formatGeoResult = (r) => {
  console.log("✅ 地理解析成功：", r.name, `(${r.latitude}, ${r.longitude})`);
  return {
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    country: r.country,
  };
};

/**
 * ========================
 * 🌦 3. Open-Meteo 天气
 * ========================
 */
export const getOpenMeteoWeather = async (lat, lon) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  );
  return await res.json();
};

/**
 * ========================================
 * 🌟 4. 统一天气入口（最终使用）
 * ========================================
 */
export const getWeatherAuto = async () => {
  const mode = import.meta.env.VITE_WEATHER_MODE;
  const key = import.meta.env.VITE_WEATHER_KEY;

  console.log("🌦 天气模式：", mode);

  // Open-Meteo 模式
  if (mode === "open-meteo") {
    // ① 获取 IP 信息
    const ipData = await getIpInfo();
    if (!ipData) return { error: true, msg: "IP 定位失败" };

    const info3 = ipData.ipdata?.info3; // 城区
    const info2 = ipData.ipdata?.info2; // 城市
    const info1 = ipData.ipdata?.info1; // 省份
    
    // 这是最终显示在 UI 上的名字 (保留中文)
    let displayName = info3 || info2 || info1 || "未知地区";

    console.log("📌 待查询区域：", displayName);

    /**
     * 搜索列表优先级：
     * 1. 城区 (最准)
     * 2. 城市
     * 3. 省份
     * 4. 国家 (保底)
     */
    const searchList = [
      info3,
      info2,
      info1,
      ipData.ipinfo?.cnip ? "中国" : "USA",
    ].filter(Boolean);

    let geo = null;

    // 循环尝试解析坐标
    for (let name of searchList) {
      geo = await geocodeCity(name);
      if (geo) {
        // 如果是用 info1 (省份) 查到的，显示名称最好也改成省份，防止名不副实
        // 但为了用户体验，我们通常尽量保留最精确的 displayName
        break; 
      }
    }

    if (!geo) {
      console.error("❌ 无法解析城市坐标");
      return { error: true, msg: "无法解析城市坐标" };
    }

    // ③ 获取天气
    const weather = await getOpenMeteoWeather(geo.lat, geo.lon);

    return {
      mode: "open-meteo",
      city: displayName, // UI显示中文名
      ...weather.current_weather,
    };
  }

  /**
   * =======================
   * 高德模式
   * =======================
   */
  if (mode === "amap") {
    if (!key) return { error: true, msg: "高德 Key 未配置" };

    const ad = await getAdcode(key);
    const w = await getWeather(key, ad.adcode);
    return {
      mode: "amap",
      city: ad.city,
      ...w.lives?.[0],
    };
  }

  return { error: true, msg: "未知天气模式" };
};
