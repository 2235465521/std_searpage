import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input, Button, Checkbox, message, Modal } from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { login, selfRegister } from "../api/standards";
import { persistAuthTokens } from "../api/tokenAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // 初始化：检查是否有记住的用户名
  useEffect(() => {
    const savedUser = localStorage.getItem("remembered_username");
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      message.warning("请输入用户名和密码！");
      return;
    }

    setLoading(true);
    try {
      const data = await login({ username, password });

      // 1. 存储 Token 并启动到期前自动续期
      persistAuthTokens({ access: data.token, refresh: data.refresh });

      // 2. 存储角色信息
      if (data.user?.role) {
        localStorage.setItem("user_role", data.user.role);
      }
      if (data.user?.username) {
        localStorage.setItem("user_name", data.user.username);
      }

      // 3. 处理“记住我”逻辑
      if (rememberMe) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      const redirectTo = location.state?.from;
      navigate(redirectTo && redirectTo !== "/login" ? redirectTo : "/search", { replace: true });
      message.success("登录成功，欢迎回来");
    } catch (error) {
      Modal.error({
        title: "提示",
        content: "账户密码输入错误",
        okText: "确认",
        centered: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const name = (registerUsername || "").trim();
    if (!name) {
      message.warning("请输入要注册的用户名");
      return;
    }
    setRegisterLoading(true);
    try {
      await selfRegister({ username: name });
      message.success("注册成功，请联系管理员获取登录密码");
      setUsername(name);
      setRegisterVisible(false);
      setRegisterUsername("");
    } catch (error) {
      message.error(error.message || "注册失败");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat relative p-4"
      style={{ backgroundImage: "url('/images/backlogin.webp')" }}
    >
      {/* 整体背景蒙版：增加一层极淡的白色透气感 */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 p-10 animate-fade-in-up">
        {/* 顶部徽标与标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/80 shadow-sm mb-6 border border-white/50">
            <SafetyCertificateFilled className="text-2xl text-blue-900" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight m-0">
            欢迎回来
          </h1>
          <p className="text-gray-500 text-sm mt-3 font-medium">
            请登录您的平台工作账号
          </p>
        </div>

        {/* 表单区域 */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              用户名
            </label>
            <Input
              size="large"
              placeholder="例如: admin"
              prefix={<UserOutlined className="text-gray-400 mr-2" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onPressEnter={handleLogin}
              className="h-12 rounded-xl border-gray-200/50 bg-white hover:border-blue-400 focus:border-blue-500 transition-all text-base shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              登录密码
            </label>
            <Input.Password
              size="large"
              placeholder="请输入密码"
              prefix={<LockOutlined className="text-gray-400 mr-2" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleLogin}
              className="h-12 rounded-xl border-gray-200/50 bg-white hover:border-blue-400 focus:border-blue-500 transition-all text-base shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="text-gray-600 text-sm font-medium"
            >
              记住我
            </Checkbox>
            {/* 按照用户要求：不需要忘记密码功能 */}
          </div>

          <Button
            type="primary"
            block
            size="large"
            onClick={handleLogin}
            loading={loading}
            icon={<ArrowRightOutlined />}
            className="h-14 mt-2 rounded-xl bg-[#0057ff] hover:bg-[#0046cc] border-0 shadow-xl shadow-blue-600/30 font-bold text-base flex flex-row-reverse items-center justify-center gap-2 transition-all duration-300 transform active:scale-95"
          >
            登录系统
          </Button>
          <Button
            block
            size="large"
            onClick={() => setRegisterVisible(true)}
            className="h-12 rounded-xl border border-blue-200 text-blue-700 bg-white/70 hover:bg-blue-50 font-semibold"
          >
            用户注册
          </Button>
        </div>

        {/* 卡片内底部文字 */}
        <div className="mt-10 pt-8 border-t border-gray-200/30 text-center">
          <p className="text-[10px] text-gray-400 leading-relaxed flex items-center justify-center gap-2">
            <SafetyCertificateFilled className="text-[12px]" />
            系统受严格监控，非授权人员请勿尝试访问。如需账号，请联系超管系统分配。
          </p>
        </div>
      </div>

      <Modal
        title="用户注册"
        open={registerVisible}
        onCancel={() => {
          if (registerLoading) return;
          setRegisterVisible(false);
        }}
        onOk={handleRegister}
        okText={registerLoading ? "注册中..." : "确认注册"}
        cancelText="取消"
        confirmLoading={registerLoading}
        destroyOnClose
      >
        <div>
          <Input
            size="large"
            placeholder="请输入用户名"
            value={registerUsername}
            onChange={(e) => setRegisterUsername(e.target.value)}
            onPressEnter={handleRegister}
          />
        </div>
      </Modal>

      {/* 页面底部版权与链接 */}
      <div className="relative z-10 mt-12 text-center">
        <p className="text-gray-500 text-xs mb-3 font-medium opacity-80">
          © 2026 Intelligent Review System.
          安全警示：未经授权严禁访问本系统。所有操作将被审计。
        </p>
        <div className="flex justify-center gap-6 text-gray-400 text-xs font-medium">
          <a href="#" className="hover:text-blue-600 transition-colors">
            隐私政策
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            使用条款
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            联系支持
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
