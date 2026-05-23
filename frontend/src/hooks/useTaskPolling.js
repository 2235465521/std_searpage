import { useState, useRef, useEffect } from 'react';
import { checkTaskStatus } from '../api/standards';
import { message } from 'antd';

export const useTaskPolling = () => {
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null); // 'PROCESSING', 'SUCCESS', 'FAILURE'
  const [taskResult, setTaskResult] = useState(null);
  const timerRef = useRef(null);

  const startPolling = (id) => {
    setTaskId(id);
    setTaskStatus('PROCESSING');
    setTaskResult(null);

    // 清理之前的定时器
    if (timerRef.current) clearInterval(timerRef.current);

    // 每 3 秒轮询一次
    timerRef.current = setInterval(async () => {
      try {
        const res = await checkTaskStatus(id);
        const { status, result } = res;
        
        if (status === 'SUCCESS' || status === 'FAILURE') {
          stopPolling();
          setTaskStatus(status);
          setTaskResult(result);
          if (status === 'SUCCESS') {
            message.success('AI 分析已完成！');
          } else {
            message.error('AI 分析失败：' + (result?.error || '未知错误'));
          }
        }
      } catch (error) {
        stopPolling();
        setTaskStatus('FAILURE');
        message.error('轮询任务状态时发生网络错误');
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 组件卸载时清理定时器防止内存泄漏
  useEffect(() => {
    return stopPolling;
  }, []);

  return { taskId, taskStatus, taskResult, startPolling, stopPolling };
};
