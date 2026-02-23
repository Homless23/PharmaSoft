import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalProvider } from './context/globalContext';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import './styles/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalProvider>
        <ConfigProvider
          theme={{
            algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
            token: {
              colorPrimary: '#1890ff',
              colorSuccess: '#22c55e',
              colorWarning: '#f59e0b',
              colorError: '#dc2626',
              colorBgLayout: '#f0f2f5',
              colorBgContainer: '#ffffff',
              colorBorder: '#d9e1ec',
              colorText: '#0f172a',
              colorTextSecondary: '#64748b',
              borderRadius: 6,
              wireframe: false,
              fontFamily: "'Inter', 'Roboto', 'Segoe UI', Arial, sans-serif",
              fontSize: 14,
              lineHeight: 1.45,
              controlHeight: 36
            },
            components: {
              Layout: {
                headerBg: '#ffffff',
                bodyBg: '#f0f2f5'
              },
              Card: {
                borderRadiusLG: 6,
                headerFontSize: 16
              },
              Button: {
                borderRadius: 6,
                controlHeight: 36,
                fontWeight: 600
              },
              Input: {
                borderRadius: 6
              },
              Select: {
                borderRadius: 6
              },
              Table: {
                headerBg: '#f7f9fc',
                rowHoverBg: '#eef4ff',
                cellPaddingBlock: 8,
                cellFontSize: 14
              },
              Tag: {
                borderRadiusSM: 6
              }
            }
          }}
        >
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </GlobalProvider>
    </BrowserRouter>
  </React.StrictMode>
);
