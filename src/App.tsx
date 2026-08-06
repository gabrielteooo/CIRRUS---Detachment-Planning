import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;
import { App as AntApp, ConfigProvider } from 'antd';
import AppShell from './components/layout/AppShell';
import PlanListPage from './pages/PlanListPage';
import DetachmentDetailsPage from './pages/DetachmentDetailsPage';
import PlanDetailsPage from './pages/PlanDetailsPage';
import { AppProvider } from './context/AppContext';

const PRIMARY = '#00636A';

const theme = {
  token: {
    colorPrimary: PRIMARY,
    colorLink: PRIMARY,
    colorLinkHover: '#004f55',
    colorLinkActive: '#003b40',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  components: {
    Button: {
      colorPrimary: PRIMARY,
      colorPrimaryHover: '#004f55',
      colorPrimaryActive: '#003b40',
    },
    Select: {
      optionSelectedBg: '#C7EBEA',
    },
    Tabs: {
      inkBarColor: PRIMARY,
      itemSelectedColor: PRIMARY,
      itemHoverColor: PRIMARY,
    },
    Checkbox: {
      colorPrimary: PRIMARY,
      colorPrimaryHover: '#004f55',
    },
    Radio: {
      colorPrimary: PRIMARY,
    },
  },
};

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp message={{ top: 24, maxCount: 3 }}>
        <AppProvider>
          <Router>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/detachment-planning" replace />} />
                <Route path="/detachment-planning" element={<PlanListPage />} />
                <Route path="/detachment-planning/:detachmentId" element={<DetachmentDetailsPage />} />
                <Route path="/detachment-planning/plan/:planId" element={<PlanDetailsPage />} />
              </Route>
            </Routes>
          </Router>
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  );
}
