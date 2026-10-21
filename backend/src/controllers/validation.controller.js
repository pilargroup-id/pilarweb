const R=require('../utils/response.util');
const ValidationService=require('../services/validation.service');
async function index(req,res,next){try{const r=await ValidationService.listOverrides(req.user,req.query);return R.paginated(res,r.data,r.meta,'Validation overrides loaded');}catch(e){return next(e);}}
async function restrictions(req,res,next){try{return R.ok(res,await ValidationService.listRestrictions(req.user,req.query),'Validation violations loaded');}catch(e){return next(e);}}
async function create(req,res,next){try{return R.created(res,await ValidationService.createOverride(req.user,req.body),'Validation override created');}catch(e){return next(e);}}
async function revoke(req,res,next){try{return R.ok(res,await ValidationService.revokeOverride(req.user,req.params.id,req.body),'Validation override revoked');}catch(e){return next(e);}}
async function resolveViolation(req,res,next){try{return R.ok(res,await ValidationService.resolveViolation(req.user,req.params.id,req.body),'Validation violation resolved');}catch(e){return next(e);}}
module.exports={index,restrictions,create,revoke,resolveViolation};
