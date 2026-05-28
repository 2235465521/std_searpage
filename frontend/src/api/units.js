import request from './axios';

export const searchUnits = (params) =>
  request({ url: '/units/search', method: 'get', params, timeout: 120000 });

export const exportUnitsExcel = (params) =>
  request({
    url: '/units/export',
    method: 'get',
    params,
    responseType: 'blob',
  });

export const fetchFirstLeadUnit = (params) =>
  request({ url: '/units/first-lead', method: 'get', params, timeout: 120000 });

export const fetchUnitFirstParticipation = (params) =>
  request({ url: '/units/first-participation', method: 'get', params, timeout: 120000 });

export const exportFirstParticipationExcel = (params) =>
  request({
    url: '/units/first-participation/export',
    method: 'get',
    params,
    responseType: 'blob',
    timeout: 120000,
  });

export const fetchUnitStandards = (unitId, params) =>
  request({ url: `/units/${unitId}/standards`, method: 'get', params });
