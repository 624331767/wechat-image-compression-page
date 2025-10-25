


const axios = require("axios");
const dayjs = require("dayjs");
const KEY = "441919309e81475ba16855ed331ca8ce"; // 填写API Key
const beseUrl = "https://mg3aap5gqf.re.qweatherapi.com";


// 缓存结构：location => { data, timestamp: dayjs实例 }
const cache = new Map();


// 缓存有效期，6分钟
const CACHE_DURATION_MINUTES = 6;

// 获取城市搜索定位信息
exports.getLocationMethods = async (req, res) => {


  const { location } = req.query;
  if (!location) {
    return res.fail("缺少 location 参数", 400);
  }
  try {
    const response = await axios.get(`${beseUrl}/geo/v2/city/lookup`, {
      headers: {
        "X-QW-Api-Key": KEY,
        "Content-Type": "application/json",
      },
      params: {
        location: location,
      },
    });
    res.success(response.data, "查询成功");
  } catch (error) {
    console.error("请求失败:", err.response?.data || err.message);
    res.fail("查询失败", 500, err.response?.data || err.message);
  }
};

// 获取实时天气信息
exports.getweatherMethods = async (req, res) => {
  console.log(req, '222');
  const { location } = req.query;
  if (!location) {
    return res.fail("缺少 location 参数", 400);
  }

  const cacheKey = location.trim();
  const now = dayjs();
  const cached = cache.get(cacheKey);

  if (cached && now.diff(cached.timestamp, 'minute') < CACHE_DURATION_MINUTES) {
    // console.log("📦 返回缓存数据（未超过6分钟）");
    return res.success(cached.data, "使用缓存数据");
  }

  try {
    const response = await axios.get(`${beseUrl}/v7/weather/now`, {
      headers: {
        "X-QW-Api-Key": KEY,
        "Content-Type": "application/json",
      },
      params: { location },
    });

    const weatherData = response.data;

    // 更新缓存
    cache.set(cacheKey, {
      data: weatherData,
      timestamp: now,
    });

    return res.success(weatherData, "查询成功");
  } catch (err) {
    console.error("请求失败:", err.response?.data || err.message);

    if (cached) {
      console.log("⚠️ 请求失败，返回缓存数据");
      return res.success(cached.data, "请求失败，使用缓存数据");
    }

    return res.fail("查询失败", 500, err.response?.data || err.message);
  }
};



// 获取资讯数据
exports.realTimeInfo = async (req, res) => {
};
