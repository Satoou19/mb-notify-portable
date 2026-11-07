const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function clean(value,key=''){
 if(/token|authorization|password|secret/i.test(key))return '[hidden]';
 if(value instanceof Error)return {name:value.name,message:clean(value.message),stack:clean(value.stack||'')};
 if(typeof value==='string')return value.replace(/Bearer\s+[^\s"']+/gi,'Bearer [hidden]').slice(0,4000);
 if(Array.isArray(value))return value.slice(0,30).map(v=>clean(v));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).slice(0,30).map(([k,v])=>[k,clean(v,k)]));
 return value;
}
function createLogger(directory){
 fs.mkdirSync(directory,{recursive:true});
 function log(level,event,details={}){try{
  const now=new Date(),day=new Date(now.getTime()+7*3600000).toISOString().slice(0,10),file=path.join(directory,'diagnostic-'+day+'.jsonl');
  if(fs.existsSync(file)&&fs.statSync(file).size>5*1024*1024){for(let n=2;n>=1;n--){const from=file+'.'+n,to=file+'.'+(n+1);if(fs.existsSync(from))fs.renameSync(from,to);}fs.renameSync(file,file+'.1');}
  fs.appendFileSync(file,JSON.stringify({at:now.toISOString(),localAt:new Date(now.getTime()+7*3600000).toISOString().replace('Z','+07:00'),pid:process.pid,level,event,...clean(details)})+'\n');
 }catch(error){try{process.stderr.write('Diagnostic log write failed: '+error.message+'\n');}catch{}}}
 const cutoff=Date.now()-14*86400000;for(const name of fs.readdirSync(directory)){if(/^diagnostic-\d{4}-\d{2}-\d{2}\.jsonl(?:\.[123])?$/.test(name)){try{const file=path.join(directory,name);if(fs.statSync(file).mtimeMs<cutoff)fs.unlinkSync(file);}catch{}}}
 return {log,directory};
}
let singleton,installed=false;
function getLogger(){return singleton||(singleton=createLogger(process.env.LOG_DIR||path.join(__dirname,'logs')));}
function installProcessLogging(){if(installed)return;installed=true;const logger=getLogger(),file=path.join(logger.directory,'session.json'),runId=crypto.randomUUID();let previous;
 try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 if(previous?.running)logger.log('warn','previous_session_unclean',{previousPid:previous.pid,lastAliveAt:previous.lastAliveAt,note:'Previous process did not record an exit. Check launcher-events and Windows logs; reason not established.'});
 function alive(running=true,code){try{fs.writeFileSync(file,JSON.stringify({runId,pid:process.pid,running,lastAliveAt:new Date().toISOString(),exitCode:code}));}catch(error){logger.log('error','session_write_failed',{error});}}
 alive();logger.log('info','process_start',{runId,node:process.version,root:__dirname});
 const timer=setInterval(()=>{alive();logger.log('info','process_alive',{uptimeSeconds:Math.round(process.uptime()),rssMB:Math.round(process.memoryUsage().rss/1048576)});},60000);timer.unref();
 process.on('uncaughtExceptionMonitor',(error,origin)=>logger.log('fatal','uncaught_exception',{origin,error}));
 process.on('unhandledRejection',reason=>{logger.log('fatal','unhandled_rejection',{error:reason instanceof Error?reason:new Error(String(reason))});process.exitCode=1;setImmediate(()=>process.exit(1));});
 process.on('exit',code=>{logger.log(code?'error':'info','process_exit',{code,uptimeSeconds:Math.round(process.uptime())});alive(false,code);});
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{logger.log('info','process_signal',{signal});process.exit(0);});
}
module.exports={createLogger,getLogger,installProcessLogging,clean};
