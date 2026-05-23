import React, { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import {
  SearchOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    // 登出逻辑后续放在 auth context 中，此处先简单清除本地 Token 并跳转
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 可以根据 localstorage 里的 role 来动态显示菜单，这里默认给管理员展示注册菜单
  const userRole = localStorage.getItem('user_role') || 'user';

  const menuItems = [
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '标准检索中心',
    },
  ];

  if (userRole === 'superadmin') {
    menuItems.push({
      key: '/register',
      icon: <UserAddOutlined />,
      label: '分配员工账号',
    });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="shadow-md z-10">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600 truncate px-4">
            {collapsed ? 'SIP' : '标准信息平台'}
          </span>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname.startsWith('/search') || location.pathname.startsWith('/detail') ? '/search' : location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="mt-2 border-r-0"
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} className="flex justify-between items-center pr-6 shadow-sm z-0">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">欢迎, 认证用户</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
              退出系统
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
          className="overflow-auto"
        >
          {/* React Router 子路由将在此处渲染 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
