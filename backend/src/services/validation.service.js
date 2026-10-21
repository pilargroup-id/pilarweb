const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

async function findRule(connection, code) {
  const [rows] = await connection.query(`SELECT * FROM validation_rules WHERE code=? AND is_active=1 LIMIT 1`, [String(code).toUpperCase()]);
  return rows[0] || null;
}

async function ensureViolation(connection, payload) {
  const rule = await findRule(connection, payload.validation_code);
  if (!rule) return null;
  const params = [rule.id, rule.code, payload.request_id || null, payload.return_id || null,
    payload.user_id || null, payload.name || null, payload.department_id || null, payload.department_name || null];
  const [existing] = await connection.query(`
    SELECT id FROM validation_violations
    WHERE validation_code=? AND status IN ('ACTIVE','OVERRIDDEN')
      AND ((? IS NULL AND request_id IS NULL) OR request_id=?)
      AND ((? IS NULL AND return_id IS NULL) OR return_id=?)
    ORDER BY id DESC LIMIT 1
  `, [rule.code, payload.request_id || null, payload.request_id || null, payload.return_id || null, payload.return_id || null]);
  if (existing[0]) return existing[0].id;
  const [result] = await connection.query(`
    INSERT INTO validation_violations (
      validation_rule_id,validation_code,request_id,return_id,user_id,name,department_id,department_name,status,detected_at
    ) VALUES (?,?,?,?,?,?,?,?,'ACTIVE',NOW())
  `, params);
  return result.insertId;
}

async function resolveViolations(connection, whereSql, params, note) {
  await connection.query(`
    UPDATE validation_violations
    SET status='RESOLVED',resolved_at=NOW(),resolution_note=?
    WHERE status IN ('ACTIVE','OVERRIDDEN') AND ${whereSql}
  `, [note || null, ...params]);
}

async function refreshReturnViolations(connection = null) {
  const db = connection || requireDatabase();
  const [overdue] = await db.query(`
    SELECT rt.id AS return_id,rt.request_id,r.requester_user_id AS user_id,r.requester_name AS name,
           r.department_id,r.department_name
    FROM returns rt INNER JOIN requests r ON r.id=rt.request_id
    WHERE rt.status<>'COMPLETED' AND rt.due_at<NOW()
  `);
  for (const row of overdue) await ensureViolation(db, { validation_code:'RETURN_OVERDUE', ...row });

  await db.query(`
    UPDATE validation_violations vv
    INNER JOIN returns rt ON rt.id=vv.return_id
    SET vv.status='RESOLVED',vv.resolved_at=COALESCE(vv.resolved_at,NOW()),vv.resolution_note=COALESCE(vv.resolution_note,'Return completed')
    WHERE vv.validation_code='RETURN_OVERDUE' AND vv.status IN ('ACTIVE','OVERRIDDEN') AND rt.status='COMPLETED'
  `);

  const [shortfalls] = await db.query(`
    SELECT rt.id AS return_id,rt.request_id,r.requester_user_id AS user_id,r.requester_name AS name,
           r.department_id,r.department_name
    FROM returns rt INNER JOIN requests r ON r.id=rt.request_id
    WHERE rt.status='COMPLETED' AND COALESCE(rt.shortfall_total_qty,0)>0
  `);
  for (const row of shortfalls) await ensureViolation(db, { validation_code:'RETURN_SHORTFALL', ...row });

  await db.query(`
    UPDATE validation_violations vv
    INNER JOIN returns rt ON rt.id=vv.return_id
    INNER JOIN requests sr ON sr.id=rt.generated_shortfall_request_id
    SET vv.status='RESOLVED',vv.resolved_at=COALESCE(vv.resolved_at,NOW()),vv.resolution_note=COALESCE(vv.resolution_note,'Return shortfall conversion PB completed')
    WHERE vv.validation_code='RETURN_SHORTFALL' AND vv.status IN ('ACTIVE','OVERRIDDEN')
      AND sr.status='COMPLETED'
  `);
}

async function hasActiveOverride(connection, violationId) {
  const [rows] = await connection.query(`
    SELECT id FROM validation_overrides
    WHERE violation_id=? AND is_active=1 AND revoked_at IS NULL
      AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>=NOW())
    LIMIT 1
  `, [violationId]);
  return Boolean(rows[0]);
}

async function blockingViolationsForUser(user, connection = null) {
  const db = connection || requireDatabase();
  await refreshReturnViolations(db);
  const snapshot = UserUtil.snapshot(user);
  const [rows] = await db.query(`
    SELECT vv.*,vr.name AS rule_name,vr.block_scope,vr.is_blocking,vr.allow_override,
           r.request_number,rt.return_number,rt.due_at AS return_due_at
    FROM validation_violations vv
    INNER JOIN validation_rules vr ON vr.id=vv.validation_rule_id AND vr.is_active=1
    LEFT JOIN requests r ON r.id=vv.request_id
    LEFT JOIN returns rt ON rt.id=vv.return_id
    WHERE vv.status IN ('ACTIVE','OVERRIDDEN') AND vr.is_blocking=1
      AND (
        (vr.block_scope='USER' AND vv.user_id=?) OR
        (vr.block_scope='DEPARTMENT' AND vv.department_id=?)
      )
    ORDER BY vv.detected_at ASC,vv.id ASC
  `, [snapshot.user_id, snapshot.department_id]);
  const result=[];
  for (const row of rows) {
    if (!(await hasActiveOverride(db,row.id))) result.push(row);
  }
  return result;
}

async function assertCanRequest(user, connection = null) {
  const violations = await blockingViolationsForUser(user, connection);
  if (violations.length) {
    throw createError('Requester is blocked by an active validation violation',409,'REQUEST_VALIDATION_BLOCKED',{violations:violations.map(v=>({id:v.id,code:v.validation_code,scope:v.block_scope,request_number:v.request_number,return_number:v.return_number,return_due_at:v.return_due_at}))});
  }
}

async function getEligibility(user) {
  const violations = await blockingViolationsForUser(user);
  return {
    can_create_request: violations.length===0,
    restrictions: violations.map(v=>({
      violation_id:v.id,code:v.validation_code,name:v.rule_name,block_scope:v.block_scope,
      request_id:v.request_id,request_number:v.request_number,return_id:v.return_id,return_number:v.return_number,
      return_due_at:v.return_due_at,detected_at:v.detected_at,allow_override:Number(v.allow_override)===1,
    })),
  };
}

async function listRestrictions(user, query={}) {
  await AccessService.requireValidationOverrideAccess(user);
  const db=requireDatabase();
  await refreshReturnViolations(db);
  const params=[];let where="WHERE vv.status IN ('ACTIVE','OVERRIDDEN')";
  if(query.code){where+=' AND vv.validation_code=?';params.push(String(query.code).toUpperCase());}
  if(query.department_id){where+=' AND vv.department_id=?';params.push(Number(query.department_id));}
  if(query.user_id){where+=' AND vv.user_id=?';params.push(String(query.user_id));}
  const [rows]=await db.query(`
    SELECT vv.*,vr.name AS rule_name,vr.block_scope,vr.is_blocking,vr.allow_override,
           r.request_number,rt.return_number,
           EXISTS(SELECT 1 FROM validation_overrides vo WHERE vo.violation_id=vv.id AND vo.is_active=1 AND vo.revoked_at IS NULL AND vo.valid_from<=NOW() AND (vo.valid_until IS NULL OR vo.valid_until>=NOW())) AS has_active_override
    FROM validation_violations vv
    INNER JOIN validation_rules vr ON vr.id=vv.validation_rule_id
    LEFT JOIN requests r ON r.id=vv.request_id
    LEFT JOIN returns rt ON rt.id=vv.return_id
    ${where}
    ORDER BY vv.detected_at DESC,vv.id DESC
  `,params);
  return rows;
}

async function listOverrides(user,query={}) {
  await AccessService.requireValidationOverrideAccess(user);
  const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;
  const [count]=await db.query('SELECT COUNT(*) AS total FROM validation_overrides');
  const [rows]=await db.query(`
    SELECT vo.*,vv.validation_code,vv.request_id,vv.return_id,vv.user_id,vv.name,vv.department_id,vv.department_name,
           r.request_number,rt.return_number
    FROM validation_overrides vo
    INNER JOIN validation_violations vv ON vv.id=vo.violation_id
    LEFT JOIN requests r ON r.id=vv.request_id
    LEFT JOIN returns rt ON rt.id=vv.return_id
    ORDER BY vo.created_at DESC,vo.id DESC LIMIT ? OFFSET ?
  `,[limit,offset]);
  const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function createOverride(user,payload={}) {
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await AccessService.requireValidationOverrideAccess(user,c);
    const id=Number(payload.violation_id);if(!Number.isInteger(id)||id<=0)throw createError('violation_id is required',422,'VALIDATION_ERROR');
    const [rows]=await c.query(`SELECT vv.*,vr.allow_override FROM validation_violations vv INNER JOIN validation_rules vr ON vr.id=vv.validation_rule_id WHERE vv.id=? LIMIT 1 FOR UPDATE`,[id]);
    const violation=rows[0];if(!violation)throw createError('Validation violation not found',404,'VALIDATION_VIOLATION_NOT_FOUND');
    if(!['ACTIVE','OVERRIDDEN'].includes(violation.status))throw createError('Only active violations can be overridden',409,'VALIDATION_VIOLATION_NOT_ACTIVE');
    if(Number(violation.allow_override)!==1)throw createError('This validation rule does not allow override',403,'VALIDATION_OVERRIDE_NOT_ALLOWED');
    const reason=optionalText(payload.reason,5000);if(!reason)throw createError('reason is required',422,'VALIDATION_ERROR');
    const validUntil=payload.valid_until?String(payload.valid_until).trim():null;
    const [result]=await c.query(`INSERT INTO validation_overrides (violation_id,reason,valid_until,is_active,created_by_user_id,created_by_name) VALUES (?,?,?,1,?,?)`,[id,reason,validUntil,user.id,user.name||null]);
    await c.query("UPDATE validation_violations SET status='OVERRIDDEN' WHERE id=?",[id]);
    await ActivityService.log(c,{request_id:violation.request_id,entity_type:'VALIDATION_OVERRIDE',entity_id:result.insertId,action_code:'VALIDATION_OVERRIDE_CREATED',actor_user_id:user.id,actor_name:user.name,after:{violation_id:id,validation_code:violation.validation_code,reason,valid_until:validUntil}});
    await c.commit();return{id:result.insertId,violation_id:id};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function revokeOverride(user,id,payload={}) {
  const db=requireDatabase();const c=await db.getConnection();
  try{await c.beginTransaction();await AccessService.requireValidationOverrideAccess(user,c);const [rows]=await c.query('SELECT * FROM validation_overrides WHERE id=? LIMIT 1 FOR UPDATE',[Number(id)]);const row=rows[0];if(!row)throw createError('Validation override not found',404,'VALIDATION_OVERRIDE_NOT_FOUND');if(!row.is_active||row.revoked_at)throw createError('Validation override is already inactive',409,'VALIDATION_OVERRIDE_INACTIVE');const reason=optionalText(payload.reason,5000);if(!reason)throw createError('reason is required',422,'VALIDATION_ERROR');await c.query('UPDATE validation_overrides SET is_active=0,revoked_by_user_id=?,revoked_by_name=?,revoked_at=NOW(),revoke_reason=? WHERE id=?',[user.id,user.name||null,reason,row.id]);await c.query("UPDATE validation_violations SET status='ACTIVE' WHERE id=? AND status='OVERRIDDEN'",[row.violation_id]);await c.commit();return{id:row.id};}catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function resolveViolation(user,id,payload={}) {
  await AccessService.requireValidationOverrideAccess(user);const db=requireDatabase();const note=optionalText(payload.reason??payload.note,5000);await db.query("UPDATE validation_violations SET status='RESOLVED',resolved_at=NOW(),resolution_note=? WHERE id=? AND status IN ('ACTIVE','OVERRIDDEN')",[note,Number(id)]);return{id:Number(id)};
}

async function recordAutoReceiptViolation(connection, request) {
  return ensureViolation(connection,{validation_code:'RECEIPT_AUTO_ACCEPTED',request_id:request.id,user_id:request.requester_user_id,name:request.requester_name,department_id:request.department_id,department_name:request.department_name});
}

module.exports={findRule,ensureViolation,resolveViolations,refreshReturnViolations,blockingViolationsForUser,assertCanRequest,getEligibility,listRestrictions,listOverrides,createOverride,revokeOverride,resolveViolation,recordAutoReceiptViolation};
