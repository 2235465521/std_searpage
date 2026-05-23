import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, Tag, Space, Card } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { searchStandards } from '../api/standards';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const SearchPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();

  // 获取数据的核心逻辑
  const fetchData = async (page = 1, pageSize = 10, formValues = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        ...formValues,
      };
      const res = await searchStandards(params);
      setData(res.items);
      setPagination({ 
        current: res.page, 
        pageSize: res.size, 
        total: res.total 
      });
    } catch (error) {
      console.error('Fetch search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchData();
  }, []);

  // 点击检索按钮
  const onSearch = (values) => {
    fetchData(1, pagination.pageSize, values);
  };

  // 表格分页或排序切换
  const handleTableChange = (newPagination) => {
    fetchData(newPagination.current, newPagination.pageSize, form.getFieldsValue());
  };

  const columns = [
    {
      title: '标准编号',
      dataIndex: 'std_id',
      key: 'std_id',
      render: (text) => <span className="font-semibold text-blue-700">{text}</span>,
    },
    {
      title: '中文名称',
      dataIndex: 'std_chinesename',
      key: 'std_chinesename',
      ellipsis: true, // 名称过长自动省略
    },
    {
      title: '标准类型',
      dataIndex: 'std_type',
      key: 'std_type',
      width: 120,
      render: (type) => {
        let color = 'default';
        if (type === 'GB') color = 'green';
        if (type === 'HB') color = 'blue';
        if (type === 'TB') color = 'purple';
        if (type === 'DB') color = 'orange';
        return <Tag color={color}>{type || '未知'}</Tag>;
      },
    },
    {
      title: '发布日期',
      dataIndex: 'release_date',
      key: 'release_date',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'ex_state',
      key: 'ex_state',
      width: 100,
      render: (state) => (
        <Tag color={state === 1 ? 'success' : 'error'}>
          {state === 1 ? '现行' : '废止'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            ghost
            icon={<FileTextOutlined />} 
            onClick={() => navigate(`/detail/${encodeURIComponent(record.std_id)}`)}
          >
            详情与分析
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 顶部搜索栏卡片 */}
      <Card className="shadow-sm rounded-xl border-gray-100">
        <Form
          form={form}
          layout="inline"
          onFinish={onSearch}
          className="gap-4 flex flex-wrap items-center"
        >
          <Form.Item name="keyword" label={<span className="font-medium text-gray-600">综合检索</span>} className="mb-0">
            <Input placeholder="输入标准名称或编号" prefix={<SearchOutlined className="text-gray-400" />} className="w-72 rounded-lg" allowClear />
          </Form.Item>
          
          <Form.Item name="std_type" label={<span className="font-medium text-gray-600">所属类别</span>} className="mb-0">
            <Select placeholder="全部分类" className="w-32 rounded-lg" allowClear>
              <Option value="GB">国标 (GB)</Option>
              <Option value="HB">行标 (HB)</Option>
              <Option value="DB">地标 (DB)</Option>
              <Option value="TB">团标 (TB)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label={<span className="font-medium text-gray-600">有效性</span>} className="mb-0">
            <Select placeholder="所有状态" className="w-32 rounded-lg" allowClear>
              <Option value={1}>现行</Option>
              <Option value={0}>废止</Option>
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 ml-auto">
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} className="bg-blue-600 hover:bg-blue-700 rounded-lg px-6">
              查 询
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格卡片 */}
      <Card className="shadow-sm rounded-xl border-gray-100 overflow-hidden" bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="std_id" 
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共为您找到 ${total} 项标准规范`,
            className: "px-6",
          }}
          loading={loading}
          onChange={handleTableChange}
          className="w-full custom-table"
        />
      </Card>
    </div>
  );
};

export default SearchPage;
