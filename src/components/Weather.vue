<template>
  <div class="weather" v-if="weather.city">
    <span>{{ weather.city }}&nbsp;</span>
    <span>{{ weather.temperature }}℃&nbsp;</span>
    <span>{{ weather.winddirection }}风&nbsp;</span>
    <span>{{ weather.windpower }}级</span>
  </div>

  <div class="weather" v-else>
    天气获取失败
  </div>
</template>

<script setup>
import { getWeatherAuto } from "@/api";

const weather = reactive({
  city: null,
  temperature: null,
  winddirection: null,
  windpower: null,
});

// 风向角度 → 中文风向
const convertWindDirection = (deg) => {
  if (deg >= 337.5 || deg < 22.5) return "北";
  if (deg >= 22.5 && deg < 67.5) return "东北";
  if (deg >= 67.5 && deg < 112.5) return "东";
  if (deg >= 112.5 && deg < 157.5) return "东南";
  if (deg >= 157.5 && deg < 202.5) return "南";
  if (deg >= 202.5 && deg < 247.5) return "西南";
  if (deg >= 247.5 && deg < 292.5) return "西";
  if (deg >= 292.5 && deg < 337.5) return "西北";
  return "未知";
};

const getWeatherData = async () => {
  const data = await getWeatherAuto();
  console.log("🌦 天气系统返回：", data);

  if (data.error) return;

  weather.city = data.city;
  weather.temperature = data.temperature;
  weather.winddirection = convertWindDirection(data.winddirection);
  weather.windpower = Math.round(data.windspeed);
};

onMounted(() => {
  getWeatherData();
});
</script>
