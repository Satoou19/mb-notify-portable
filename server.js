const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const ROOT = __dirname;
const diagnostics=require('./diagnostics');diagnostics.installProcessLogging();const {log}=diagnostics.getLogger();
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(DATA, {recursive:true});
const configPath = path.join(DATA,'config.json');
if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({token:crypto.randomBytes(24).toString('hex')}));
const config = JSON.parse(fs.readFileSync(configPath));
const file = path.join(DATA,'events.json');
let events = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const clients = new Set();
const excelCommand=require('./excel').createExcelService(DATA);
let device = null;
let revision = Date.now();
const PHONE_TIMEOUT = 45000;
function connectionStatus(now=Date.now()) {
  return {state:!device?'never':now-device.lastSeen>PHONE_TIMEOUT?'offline':'online',device,timeoutMs:PHONE_TIMEOUT,serverTime:now};
}
function broadcast(name,data){for(const client of clients)client.write(`${name?'event: '+name+'\n':''}data: ${JSON.stringify(data)}\n\n`);}
let fnetLogState='';
const fnet=require('./fnet').loadFnet(DATA,data=>{const signature=JSON.stringify([data.status,data.error,data.storageError,data.debtStorageError]);if(signature!==fnetLogState){fnetLogState=signature;log(data.status==='error'||data.storageError||data.debtStorageError?'warn':'info','fnet_status',{status:data.status,error:data.error,storageError:data.storageError,debtStorageError:data.debtStorageError,machines:data.machines.length,updatedAt:data.updatedAt});}broadcast('fnet',data);});
let phoneLogState='never';
function logPhone(){const status=connectionStatus(),key=[status.state,status.device?.listenerEnabled].join(':');if(key!==phoneLogState){phoneLogState=key;log(status.state==='offline'?'warn':'info','phone_status',{state:status.state,listenerEnabled:status.device?.listenerEnabled,pending:status.device?.pending,lastSeen:status.device?.lastSeen});}}
let phoneTimer,clientLogWindow=0,clientLogCount=0;
function save(){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(events));fs.renameSync(tmp,file);}
function local(req){return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function parseAmount(text){const match=text.match(/(?:\+\s*|(?:ghi có|nhận được|cộng)\s*)(\d[\d.,]*)\s*(?:VND|VNĐ|đ)/i);return match ? Number(match[1].replace(/[.,]/g,'')) : null;}
const server=http.createServer(async(req,res)=>{
  const requestedAt=Date.now();res.on('finish',()=>{if(res.statusCode>=400)log('warn','http_error',{method:req.method,route:req.url.split('?')[0].slice(0,120),status:res.statusCode,durationMs:Date.now()-requestedAt});});
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='POST' && ['/api/notifications','/api/heartbeat'].includes(req.url)){
    if(req.headers.authorization!==`Bearer ${config.token}`)return send(res,401,{error:'Sai mã ghép nối'});
    let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32768){send(res,413,{error:'Quá dung lượng'});req.destroy();return;}}}catch{return;}
    let data;try{data=JSON.parse(body);}catch{return send(res,400,{error:'JSON không hợp lệ'});}
    if(req.url==='/api/heartbeat'){
      if(!data||typeof data.deviceId!=='string'||!data.deviceId||data.deviceId.length>100||!Number.isInteger(data.pending)||data.pending<0||data.pending>500||typeof data.listenerEnabled!=='boolean')return send(res,400,{error:'Heartbeat không hợp lệ'});
      device={id:data.deviceId,name:String(data.name||'Android').slice(0,100),lastSeen:Date.now(),pending:data.pending,listenerEnabled:data.listenerEnabled};
      logPhone();
      broadcast('connection',connectionStatus());return send(res,200,{ok:true,serverTime:Date.now()});
    }
    if(!data || typeof data.id!=='string'||!data.id||data.id.length>512||typeof data.text!=='string'||!data.text.trim()||data.text.length>12000||!['com.mbmobile','demo'].includes(data.packageName))return send(res,400,{error:'Thông báo không hợp lệ'});
    if(events.some(x=>x.id===data.id))return send(res,200,{duplicate:true});
    const event={id:data.id,title:String(data.title||'MB Bank').slice(0,200),text:data.text,packageName:data.packageName,receivedAt:new Date().toISOString(),postedAt:Number(data.postedAt)||Date.now(),amount:parseAmount(data.text),demo:data.packageName==='demo'};
    const previous=events;
    events=[event,...events].filter(e=>e.demo===event.demo).slice(0,event.demo?100:1000)
      .concat(previous.filter(e=>e.demo!==event.demo)).sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt));
    try{save();}catch(error){log('error','events_save_failed',{error});events=previous;return send(res,500,{error:'Không lưu được dữ liệu'});}
    log('info','notification_received',{id:event.id,demo:event.demo});
    revision++;
    broadcast('',{...event,revision});
    return send(res,201,{ok:true});
  }
  if(!local(req))return send(res,403,{error:'Trang quản lý chỉ mở trên máy tính này'});
  // Prevent another website from reading the pairing token through DNS rebinding.
  const allowedHosts=['localhost','127.0.0.1','[::1]'];
  if(!allowedHosts.some(h=>req.headers.host===h||req.headers.host?.startsWith(h+':')))return send(res,403,{error:'Mở bằng localhost'});
  if(req.url==='/api/client-log'&&req.method==='POST'){
    if(req.headers.authorization!==`Bearer ${config.token}`)return send(res,401,{error:'Sai mã ghép nối'});
    if(Date.now()-clientLogWindow>60000){clientLogWindow=Date.now();clientLogCount=0;}if(++clientLogCount>20)return send(res,429,{error:'Quá nhiều log'});
    try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(res,413,{error:'Quá dung lượng'});}const data=JSON.parse(body);if(typeof data?.kind!=='string'||typeof data?.message!=='string')return send(res,400,{error:'Log không hợp lệ'});log('warn','browser_error',{kind:data.kind.slice(0,60),message:data.message.slice(0,2000),stack:String(data.stack||'').slice(0,3000)});return send(res,200,{ok:true});}catch{return send(res,400,{error:'Log không hợp lệ'});}
  }
  if(req.method==='POST'&&['/api/excel/preview','/api/excel/write'].includes(req.url)){
    if(req.headers.authorization!==`Bearer ${config.token}`)return send(res,401,{error:'Sai mã ghép nối'});
    let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(res,413,{error:'Quá dung lượng'});}const data=JSON.parse(body);if(!data||typeof data!=='object')throw Error('Dữ liệu không hợp lệ');const result=await excelCommand(req.url.split('/').pop(),data,events);return send(res,200,result);}catch(error){return send(res,400,{error:error.message});}
  }
  if(req.url==='/api/config'){
    const ips=Object.values(os.networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal).map(x=>x.address);
    return send(res,200,{token:config.token,urls:ips.map(ip=>`http://${ip}:${server.address().port}`)});
  }
  if(req.url==='/api/events')return send(res,200,events);
  if(req.url==='/api/state')return send(res,200,{events,connection:connectionStatus(),revision,fnet:fnet.snapshot()});
  if(req.url==='/api/fnet'&&req.method==='GET')return send(res,200,fnet.snapshot());
  if(req.url==='/api/fnet/debt'&&req.method==='POST'){
    if(req.headers.authorization!==`Bearer ${config.token}`)return send(res,401,{error:'Sai mã ghép nối'});
    try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(res,413,{error:'Quá dung lượng'});}const input=JSON.parse(body),result=fnet.setDebt(input);log('info','fnet_debt_changed',{machine:input.machine,action:input.amount===0?'paid':'set',amount:input.amount});return send(res,200,result);}catch(error){log('error','fnet_debt_failed',{error});return send(res,400,{error:error.message});}
  }
  if(req.url?.startsWith('/api/fnet/ack/')&&req.method==='POST'){
    if(req.headers.authorization!==`Bearer ${config.token}`)return send(res,401,{error:'Sai mã ghép nối'});
    const id=req.url.slice('/api/fnet/ack/'.length);
    const acknowledged=fnet.acknowledge(id);
    return send(res,acknowledged?200:404,{ok:acknowledged});
  }
  if(req.url==='/api/stream'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);const timer=setInterval(()=>res.write(': ping\n\n'),20000);req.on('close',()=>{clearInterval(timer);clients.delete(res);});return;
  }
  const pages={'/':'index.html','/app.js':'app.js','/transactions.js':'transactions.js','/fnet-ui.js':'fnet-ui.js','/client-log.js':'client-log.js','/style.css':'style.css'};
  if(pages[req.url]){res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript; charset=utf-8':req.url.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');return fs.createReadStream(path.join(ROOT,'public',pages[req.url])).pipe(res);}
  send(res,404,{error:'Không tìm thấy'});
});
server.on('error',error=>log('error','server_error',{error}));
server.on('clientError',(error,socket)=>{log('warn','http_client_error',{error});socket.destroy();});
server.on('listening',()=>{log('info','server_listening',{port:server.address().port});phoneTimer=setInterval(logPhone,5000);phoneTimer.unref();if(process.env.FNET_DISABLED!=='1')fnet.start();});
server.on('close',()=>{clearInterval(phoneTimer);fnet.stop();log('info','server_closed');});
if(require.main===module)server.listen(Number(process.env.PORT)||3189,'0.0.0.0',()=>console.log(`MB Bank Notify: http://localhost:${server.address().port}`));
module.exports={server,parseAmount,connectionStatus};
