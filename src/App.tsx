import { Layout, Menu, Button, Popconfirm, message } from 'antd';
import {
  CalendarOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { APP_TITLE } from './constants';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import TeamPage from './pages/TeamPage';

/** 应用壳：侧边导航 + 路由出口 */
function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetAll = useStore((s) => s.resetAll);

  const items = [
    { key: '/', icon: <CalendarOutlined />, label: '日历' },
    { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务列表' },
    { key: '/team', icon: <TeamOutlined />, label: '团队' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider theme="light" width={200} breakpoint="lg" style={{ position: 'relative' }}>
        <div className="app-logo">🏢 {APP_TITLE}</div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
        />
        <div className="app-footer">
          <Popconfirm
            title="重置所有数据？"
            description="将清空当前数据并恢复示例数据。"
            okText="重置"
            okButtonProps={{ danger: true }}
            onConfirm={() => {
              resetAll();
              message.success('已重置为示例数据');
            }}
          >
            <Button size="small" type="text" icon={<ReloadOutlined />}>
              重置数据
            </Button>
          </Popconfirm>
        </div>
      </Layout.Sider>

      <Layout>
        <Layout.Content className="app-content">
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/team" element={<TeamPage />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
