const {execFile}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {filtered}=require('./public/transactions');
const EXPECTED_WORKBOOK='FILE CHỐT CA tháng 11 cn1';
function bridge(payload,dataDir){return new Promise((resolve,reject)=>{
 const job=path.join(dataDir,'excel-'+crypto.randomUUID()+'.json');fs.writeFileSync(job,JSON.stringify(payload));
 const shell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 execFile(shell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'excel-bridge.ps1'),'-PayloadPath',job],{windowsHide:true,timeout:30000,maxBuffer:128*1024,encoding:'utf8'},(error,stdout)=>{
  fs.unlinkSync(job);let result;try{result=JSON.parse(stdout.replace(/^\uFEFF/,''));}catch{return reject(Error('Không kết nối được Excel; kiểm tra file đang mở và đóng các hộp thoại.'));}if(error||result.error)return reject(Error(result.error||'Excel không phản hồi'));resolve(result);
 });
});}
function createExcelService(dataDir,runBridge=payload=>bridge(payload,dataDir)){
 const previews=new Map();let busy=false;
 return async function(command,data,events){
  if(busy)throw Error('Đang xử lý Excel. Chờ thao tác trước hoàn tất.');busy=true;
  try{const now=Date.now();for(const [key,p]of previews)if(p.expires<now)previews.delete(key);
   if(command==='preview'){
    if(!Number.isFinite(data.start)||!Number.isFinite(data.end)||data.start>data.end||data.end-data.start>32*86400000)throw Error('Khoảng ngày giờ không hợp lệ (tối đa 32 ngày).');
    const account=data.account===undefined?'all':data.account;
    if(typeof account!=='string'||(account!=='all'&&!/^[0-9*]{0,31}$/.test(account)))throw Error('Tài khoản lọc không hợp lệ.');
    const list=filtered(events,data.start,data.end,account);if(!list.length)throw Error('Không có tiền vào để ghi Excel.');
    const payload={mode:'preview',expectedWorkbook:EXPECTED_WORKBOOK,values:list.map(t=>t.amount/1000)};
    const result=await runBridge(payload),previewId=crypto.randomUUID();previews.set(previewId,{payload:{...payload,mode:'write',fingerprint:result.fingerprint},expires:now+120000});
    return {...result,previewId,account,total:list.reduce((s,t)=>s+t.amount,0)};
   }
   if(command==='write'){
    const preview=previews.get(data.previewId);if(!preview)throw Error('Bản xem trước đã hết hạn hoặc đã dùng. Hãy xem trước lại.');
    previews.delete(data.previewId);return await runBridge(preview.payload);
   }
   throw Error('Thao tác Excel không hợp lệ');
  }finally{busy=false;}
 };
}
module.exports={createExcelService};
