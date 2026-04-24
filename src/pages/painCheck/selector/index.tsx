import { WebView } from '@tarojs/components';
import Taro from '@tarojs/taro';

const SELECTOR_URL = 'https://lujiangc.com/pain-check/3d?from=mp';
const STORAGE_KEY = 'painCheck.lastSelected';

interface WebViewMessagePayload {
  selectedIds?: string[];
}

interface WebViewMessageEventDetail {
  data?: WebViewMessagePayload | WebViewMessagePayload[];
}

const Selector = () => {
  const handleMessage = (e: { detail: WebViewMessageEventDetail }) => {
    const raw = e.detail?.data;
    const last = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    const ids = last?.selectedIds;
    if (Array.isArray(ids)) {
      Taro.setStorageSync(STORAGE_KEY, ids);
    }
  };

  return <WebView src={SELECTOR_URL} onMessage={handleMessage} />;
};

export default Selector;
