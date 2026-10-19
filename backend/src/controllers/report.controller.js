const R=require('../utils/response.util');
const ReportService=require('../services/report.service');
async function requests(req,res,next){try{const r=await ReportService.listRequests(req.user,req.query);return R.paginated(res,r.data,r.meta,'Request report loaded');}catch(e){return next(e);}}
module.exports={requests};
