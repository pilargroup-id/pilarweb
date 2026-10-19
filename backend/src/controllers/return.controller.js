const R=require('../utils/response.util');
const ReturnService=require('../services/return.service');
async function index(req,res,next){try{const r=await ReturnService.list(req.user,req.query);return R.paginated(res,r.data,r.meta,'Returns loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await ReturnService.getById(req.user,req.params.id),'Return loaded');}catch(e){return next(e);}}
async function submit(req,res,next){try{return R.ok(res,await ReturnService.submit(req.user,req.params.id,req.body),'Return submitted');}catch(e){return next(e);}}
async function receive(req,res,next){try{return R.ok(res,await ReturnService.receive(req.user,req.params.id,req.body),'Return receipt recorded');}catch(e){return next(e);}}
module.exports={index,show,submit,receive};
