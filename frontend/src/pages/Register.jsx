import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Radio, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, UserAddOutlined } from '@ant-design/icons';
import { registerApi } from '../api/auth';

const fieldLabelClass = 'mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-gray-500';
const fieldInputClass =
  'h-12 rounded-xl border-gray-200/50 bg-white text-base shadow-sm transition-all hover:border-blue-400 focus:border-blue-500';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('user_role') !== 'superadmin') {
      message.warning('仅超级管理员可分配账号');
      navigate('/search', { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e) => {
    setFormData((prev) => ({ ...prev, role: e.target.value }));
  };

  const handleRegister = async () => {
    const { username, email, password, confirmPassword, role } = formData;

    if (!username || !password || !confirmPassword) {
      message.warning('请完整填写必填项（用户名、密码）');
      return;
    }

    if (password !== confirmPassword) {
      message.error('两次输入的密码不一致！');
      return;
    }

    setLoading(true);
    try {
      await registerApi({ username, email, password, role });
      message.success(`人员账号 [${username}] 分配成功！`);
      setFormData({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
    } catch (error) {
      message.error(error.message || '注册失败，请检查该用户名是否已存在或无权限');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex justify-center py-4 md:py-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-[0_20px_50px_rgba(0,88,188,0.08)] backdrop-blur-2xl md:p-10">
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/50 bg-white/80 shadow-sm">
            <UserAddOutlined className="text-2xl text-blue-700" />
          </div>
          <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">分配系统账号</h2>
          <p className="mt-2 text-sm font-medium text-gray-500">超级管理员专属 · 添加并授权新的业务人员</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className={fieldLabelClass}>
              登录用户名 <span className="text-red-500">*</span>
            </label>
            <Input
              size="large"
              name="username"
              value={formData.username}
              onChange={handleChange}
              prefix={<UserOutlined className="mr-2 text-gray-400" />}
              placeholder="请输入英文字母或拼音"
              className={fieldInputClass}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>联系邮箱</label>
            <Input
              size="large"
              name="email"
              value={formData.email}
              onChange={handleChange}
              prefix={<MailOutlined className="mr-2 text-gray-400" />}
              placeholder="可选：输入员工邮箱"
              className={fieldInputClass}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>
              初始登录密码 <span className="text-red-500">*</span>
            </label>
            <Input.Password
              size="large"
              name="password"
              value={formData.password}
              onChange={handleChange}
              prefix={<LockOutlined className="mr-2 text-gray-400" />}
              placeholder="请设置安全的登录密码"
              className={fieldInputClass}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>
              确认密码 <span className="text-red-500">*</span>
            </label>
            <Input.Password
              size="large"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              prefix={<LockOutlined className="mr-2 text-gray-400" />}
              placeholder="请再次输入密码以确认"
              className={fieldInputClass}
            />
          </div>

          <div>
            <label className={`${fieldLabelClass} normal-case`}>赋予系统角色</label>
            <Radio.Group
              onChange={handleRoleChange}
              value={formData.role}
              className="grid w-full grid-cols-2 gap-3"
            >
              <Radio.Button value="user" className="h-11 rounded-xl text-center leading-[2.75rem]">
                普通业务员
              </Radio.Button>
              <Radio.Button
                value="superadmin"
                className="h-11 rounded-xl text-center font-medium leading-[2.75rem] text-red-600"
              >
                超级管理员
              </Radio.Button>
            </Radio.Group>
          </div>

          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleRegister}
            className="mt-2 h-12 rounded-xl border-0 bg-primary font-bold shadow-lg shadow-blue-600/20 transition-all hover:bg-primary-container active:scale-[0.98]"
          >
            立即分配账号
          </Button>
        </div>

        <p className="mt-8 border-t border-gray-200/40 pt-6 text-center text-[10px] leading-relaxed text-gray-400">
          分配完成后请将账号信息告知对应人员，请妥善保管初始密码
        </p>
      </div>
    </div>
  );
};

export default Register;
