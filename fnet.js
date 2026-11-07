const {execFile}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').trim();
function parseSnapshot(data){
 if(!data?.ok||!Array.isArray(data.headers)||!Array.isArray(data.rows))throw Error(data?.error||'Không đọc được bảng FNet.');
 const headers=data.headers.map(normalize),index=name=>headers.indexOf(normalize(name));
 if(index('Tên máy')<0||index('Tình trạng')<0)throw Error('Bảng FNet thiếu cột Tên máy / Tình trạng.');
 const names=new Set();
 return data.rows.map(row=>{
  if(!Array.isArray(row))throw Error('Dòng FNet không hợp lệ.');
  const get=name=>String(row[index(name)]||'').trim(),name=get('Tên máy'),status=get('Tình trạng');
  if(!name||names.has(name)||!status)throw Error('Bảng FNet đang thay đổi hoặc trùng tên máy; chờ lần đọc tiếp theo.');
  names.add(name);
  const state=normalize(status)==='mat ket noi'?'offline':normalize(status)==='dang su dung'?'online':'other';
  return {name,status,state,user:get('Tên người dùng'),ip:get('Địa chỉ IP'),started:get('Bắt đầu'),used:get('Đã dùng'),remaining:get('Còn lại'),amount:get('Số tiền'),group:get('Nhóm máy'),note:get('Ghi chú'),combo:get('COMBO'),day:get('Ngày'),version:get('Phiên bản')};
 }).sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true}));
}
function readFnet(){return new Promise((resolve,reject)=>{
 execFile(path.join(__dirname,'FNetReader.exe'),[],{windowsHide:true,timeout:12000,maxBuffer:2*1024*1024,encoding:'utf8'},(error,out)=>{
  let data;try{data=JSON.parse(out.replace(/^\uFEFF/,''));}catch{return reject(Error(error?.code==='ENOENT'?'Thiếu FNetReader.exe trong thư mục ứng dụng.':'Bộ đọc FNet không phản hồi. Kiểm tra FNet đang chạy và quyền của hai ứng dụng.'));}
  if(error||!data.ok)return reject(Error(data.error||'Không đọc được FNet.'));
  resolve(data);
 });
});}
function remainingMinutes(value){const match=String(value||'').trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);return match&&+match[2]<60&&(!match[3]||+match[3]<60)?+match[1]*60 + +match[2]+ +(match[3]||0)/60:null;}
function createFnetService({read=readFnet,onChange=()=>{},save=()=>{},alerts=[],debts=[],saveDebts=()=>{},now=Date.now}={}){
 let state={status:'waiting',error:'Đang chờ đọc bảng FNet…',machines:[],alerts:alerts.filter(a=>['debt-low','debt-offline'].includes(a.type)),debts:structuredClone(debts),updatedAt:null,checkedAt:null,intervalMs:5000},timer,busy=false,stopped=false;
 const tracked=new Map(),pending=new Map(),debtPending=new Map();
 function publish(){onChange(snapshot());}
 function snapshot(){return {...state,debts:structuredClone(state.debts),alerts:state.alerts.map(a=>({...a})),machines:state.machines.map(m=>({...m}))};}
 function persist(){try{save(state.alerts);state.storageError=null;}catch{state.storageError='Chưa lưu được lịch sử cảnh báo FNet.';}}
 function persistDebts(){try{saveDebts(state.debts);state.debtStorageError=null;}catch{state.debtStorageError='Chưa lưu được ghi nợ FNet. Kiểm tra quyền ghi thư mục data.';}}
 function addAlert(machine,previous,type,debt){
  if(!debt||!['debt-low','debt-offline'].includes(type))return;
  const amount=debt?new Intl.NumberFormat('vi-VN').format(debt.amount)+' ₫':'';
  const message=type==='debt-low'?machine.name+' còn '+machine.remaining+' · chưa trả '+amount:type==='debt-offline'?machine.name+' mất kết nối · chưa trả '+amount:machine.name+' chuyển sang Mất kết nối';
  state.alerts.unshift({id:crypto.randomUUID(),type,machine:machine.name,user:previous?.user||machine.user,at:new Date(now()).toISOString(),acknowledged:false,message,previousStatus:previous?.status||machine.status,debtAmount:debt?.amount||0});state.alerts=state.alerts.slice(0,100);persist();
 }
 function setDebt(data){
  if(!data||typeof data.machine!=='string'||!data.machine.trim()||data.machine.length>100||!Number.isSafeInteger(data.amount)||data.amount<0||data.amount>999999999999||typeof(data.note??'')!=='string'||(data.note||'').length>500)throw Error('Nhập tên máy và số tiền nguyên đồng hợp lệ (0 để đánh dấu đã trả).');
  const existing=state.debts.find(d=>d.machine===data.machine),machine=state.machines.find(m=>m.name===data.machine);
  if(!existing&&!machine)throw Error('Không tìm thấy máy trong danh sách FNet.');
  const next=state.debts.filter(d=>d.machine!==data.machine);
  if(data.amount>0)next.push({...existing,machine:data.machine,amount:data.amount,note:(data.note||'').trim(),user:existing?.user||machine?.user||'',updatedAt:new Date(now()).toISOString(),remindedSession:existing?.remindedSession||null,offlineNotified:existing?.offlineNotified||false});
  saveDebts(next);state.debts=next;state.debtStorageError=null;debtPending.delete(data.machine);publish();return snapshot();
 }
 async function poll(){
  if(busy||stopped)return;busy=true;
  try{
   const machines=parseSnapshot(await read());if(stopped)return;
   if(!machines.length)throw Error('Bảng FNet chưa có máy. Giữ nguyên lần đọc trước.');
   const time=new Date(now()).toISOString(),seen=new Set();
   for(const machine of machines){
    const key=machine.name;seen.add(key);
    const previous=tracked.get(key);
    const debt=state.debts.find(d=>d.machine===key);
    if(machine.state==='offline'&&previous&&previous.state!=='offline'){
     const count=(pending.get(key)||0)+1;pending.set(key,count);
     if(count>=2){
      pending.delete(key);tracked.set(key,machine);
     }
    }else{pending.delete(key);tracked.set(key,machine);}
    if(debt){
     let changed=false;
     if(machine.state==='offline'){
      const count=(debtPending.get(key)||0)+1;debtPending.set(key,count);
      if(count>=2&&!debt.offlineNotified){addAlert(machine,previous,'debt-offline',debt);debt.offlineNotified=true;changed=true;}
     }else{
      debtPending.delete(key);if(debt.offlineNotified){debt.offlineNotified=false;changed=true;}
      if(machine.state==='online'){
       const minutes=remainingMinutes(machine.remaining),session=[machine.user,machine.started,machine.day].join('|');
       if(minutes!==null&&minutes<=30&&debt.remindedSession!==session){addAlert(machine,previous,'debt-low',debt);debt.remindedSession=session;changed=true;}
       else if(minutes!==null&&minutes>30&&debt.remindedSession){debt.remindedSession=null;changed=true;}
      }
     }
     if(changed)persistDebts();
    }else debtPending.delete(key);
   }
   for(const key of pending.keys())if(!seen.has(key))pending.delete(key);
   for(const key of debtPending.keys())if(!seen.has(key))debtPending.delete(key);
   state={...state,status:'online',error:null,machines,updatedAt:time,checkedAt:time};
  }catch(error){
   if(stopped)return;pending.clear();debtPending.clear();
   state={...state,status:'error',error:error.message,checkedAt:new Date(now()).toISOString()};
  }finally{busy=false;if(!stopped)publish();}
 }
 return {snapshot,poll,setDebt,start(){clearInterval(timer);stopped=false;poll();timer=setInterval(poll,5000);timer.unref?.();},stop(){stopped=true;clearInterval(timer);},acknowledge(id){const alert=state.alerts.find(a=>a.id===id);if(!alert)return false;alert.acknowledged=true;persist();publish();return true;}};
}
function loadFnet(dataDir,onChange){
 const file=path.join(dataDir,'fnet-alerts.json');let alerts=[];
 try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(data))alerts=data.slice(0,100);}catch(error){if(error.code!=='ENOENT')require('./diagnostics').getLogger().log('error','fnet_data_load_failed',{file:path.basename(file),error});}
 const debtFile=path.join(dataDir,'fnet-debts.json');let debts=[];
 try{const data=JSON.parse(fs.readFileSync(debtFile,'utf8'));if(Array.isArray(data))debts=data.filter(d=>d&&typeof d.machine==='string'&&Number.isSafeInteger(d.amount)&&d.amount>0);}catch(error){if(error.code!=='ENOENT')require('./diagnostics').getLogger().log('error','fnet_data_load_failed',{file:path.basename(debtFile),error});}
 return createFnetService({alerts,debts,onChange,saveDebts:data=>{fs.writeFileSync(debtFile+'.tmp',JSON.stringify(data));fs.renameSync(debtFile+'.tmp',debtFile);},save:data=>{fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);}});
}
module.exports={createFnetService,parseSnapshot,loadFnet,remainingMinutes};
