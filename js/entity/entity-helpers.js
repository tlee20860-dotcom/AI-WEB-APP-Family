// ============================================
// entity-helpers.js — 實體 CRUD 與編號生成
// ============================================

import { api } from '../app-data.js';
import { getEntityDef } from './entity-defs.js';

export async function generateCode(entityType, list) {
  const def = getEntityDef(entityType);
  if (!def || !def.prefix) return null;
  const codes = list.map(x => x.code).filter(Boolean);
  let max = 0;
  codes.forEach(c => {
    if (c.startsWith(def.prefix + '-')) {
      const n = parseInt(c.split('-').pop(), 10);
      if (n > max) max = n;
    }
  });
  return `${def.prefix}-${String(max + 1).padStart(3, '0')}`;
}

export async function createEntity(type, data, allRows = []) {
  const code = await generateCode(type, allRows);
  const extra = { ...data };
  delete extra.name;
  return api.entityCreate({ entityType: type, action: 'create', code, name: data.name, extra });
}

export async function updateEntity(type, id, data) {
  const extra = { ...data };
  delete extra.name;
  return api.entityCreate({ entityType: type, action: 'update', id, name: data.name, extra });
}

export async function removeEntity(type, id) {
  return api.entityCreate({ entityType: type, action: 'delete', id });
}