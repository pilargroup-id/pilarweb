const R = require('../utils/response.util');
const ReportService = require('../services/report.service');

async function requests(req,res,next){
  try{
    const result = await ReportService.listRequests(req.user, req.query);
    return R.paginated(res, result.data, result.meta, 'Request report loaded');
  }catch(err){return next(err);}
}

module.exports = { requests };
