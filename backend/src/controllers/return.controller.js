const R=require('../utils/response.util');
const ReturnService=require('../services/return.service');
async function index(req,res,next){try{const r=await ReturnService.list(req.user,req.query);return R.paginated(res,r.data,r.meta,'Returns loaded');}catch(e){return next(e);}}
async function create(req,res,next){try{return R.created(res,await ReturnService.create(req.user,req.body),'Return submitted');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await ReturnService.getById(req.user,req.params.id),'Return loaded');}catch(e){return next(e);}}
async function receive(req,res,next){try{return R.ok(res,await ReturnService.receive(req.user,req.params.id,req.body),'Return received');}catch(e){return next(e);}}
async function inspect(req,res,next){try{return R.ok(res,await ReturnService.inspect(req.user,req.params.id,req.body),'Return inspection completed');}catch(e){return next(e);}}
module.exports={index,create,show,receive,inspect};
