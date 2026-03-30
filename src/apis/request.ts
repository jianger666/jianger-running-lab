import Taro from '@tarojs/taro';

const BASE_URL = 'https://lujiangc.com';

interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
  timestamp: number;
}

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  showError?: boolean;
}

type RequestInterceptor = (config: RequestConfig) => RequestConfig;
type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

const addRequestInterceptor = (fn: RequestInterceptor) => {
  requestInterceptors.push(fn);
};

const addResponseInterceptor = (fn: ResponseInterceptor) => {
  responseInterceptors.push(fn);
};

addRequestInterceptor((config) => {
  const token = Taro.getStorageSync('token');
  if (token) {
    config.header = {
      ...config.header,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// 默认响应拦截器：统一错误处理
addResponseInterceptor((response) => {
  if (!response.success) {
    Taro.showToast({ title: response.message || '请求失败', icon: 'none' });
    throw new Error(response.message);
  }
  return response;
});

const request = async <T = unknown>(config: RequestConfig): Promise<T> => {
  let finalConfig = { ...config };
  for (const interceptor of requestInterceptors) {
    finalConfig = interceptor(finalConfig);
  }

  const resp = await Taro.request({
    url: `${BASE_URL}${finalConfig.url}`,
    method: finalConfig.method || 'GET',
    data: finalConfig.data,
    header: {
      'Content-Type': 'application/json',
      ...finalConfig.header,
    },
  });

  let result = resp.data as ApiResponse<T>;
  for (const interceptor of responseInterceptors) {
    result = interceptor(result);
  }

  return result.data;
};

const http = {
  get: <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'GET', data }),

  post: <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'POST', data }),

  put: <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data }),

  delete: <T = unknown>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', data }),
};

export { http, request, addRequestInterceptor, addResponseInterceptor };
export type { ApiResponse, RequestConfig };
