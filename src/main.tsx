import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'antd/dist/reset.css';
import './index.css';
import App from './App';
import { useStore } from './store/useStore';

dayjs.locale('zh-cn');

// 首次打开（localStorage 为空）时灌入示例数据；幂等，StrictMode 双执行安全
useStore.getState().seedIfEmpty();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
