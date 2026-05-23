import axiosInstance from './axios';

export const registerApi = (data) => {
  return axiosInstance.post('/auth/register', data);
};
