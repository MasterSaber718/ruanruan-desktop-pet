import { useState, useEffect } from 'react';

interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  timestamp: number;
}

interface UseWeatherReturn {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export default function useWeather(city: string): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (!city) {
      setWeather(null);
      setError('请输入城市名称');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 模拟API调用 - 实际项目中应使用真实的天气API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟天气数据
      const mockWeather: WeatherData = {
        city,
        temperature: Math.floor(Math.random() * 35) - 5, // -5 to 30 degrees
        condition: ['晴朗', '多云', '小雨', '阴天', '大风'][Math.floor(Math.random() * 5)],
        humidity: Math.floor(Math.random() * 60) + 30, // 30% to 90%
        windSpeed: Math.floor(Math.random() * 30) + 5, // 5 to 35 km/h
        timestamp: Date.now()
      };

      setWeather(mockWeather);
    } catch (err) {
      setError('获取天气信息失败，请稍后再试');
      console.error('Weather API error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和城市变化时获取天气
  useEffect(() => {
    fetchWeather();
  }, [city]);

  return {
    weather,
    loading,
    error,
    refresh: fetchWeather
  };
}
