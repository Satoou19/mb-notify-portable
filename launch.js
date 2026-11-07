const {execFile}=require('node:child_process');
const port=Number(process.env.PORT)||3189;
const url=`http://localhost:${port}`;
function openPage(){
 if(process.env.MB_NOTIFY_NO_BROWSER==='1')return;
 execFile('explorer.exe',[url],{windowsHide:true},()=>{});
}
async function running(){
 try{
  const [stateResponse,pageResponse]=await Promise.all([
   fetch(url+'/api/state',{signal:AbortSignal.timeout(2500)}),
   fetch(url+'/',{signal:AbortSignal.timeout(2500)})
  ]);
  if(!stateResponse.ok||!pageResponse.ok)return false;
  const state=await stateResponse.json(),page=await pageResponse.text();
  return Array.isArray(state.events)&&typeof state.revision==='number'&&!!state.connection&&page.includes('<title>MB Notify');
 }catch{return false;}
}
async function main(){
 if(await running()){
  console.log('MB Notify dang chay. Mo lai trang '+url);
  openPage();return;
 }
 const {server}=require('./server');
 server.once('error',async error=>{
  if(error.code==='EADDRINUSE'){
   if(await running()){console.log('MB Notify dang chay. Mo lai trang '+url);openPage();}
   else {console.error('Cong '+port+' dang duoc chuong trinh khac su dung. Khong the khoi dong MB Notify.');process.exitCode=1;}
  }else{console.error('Khong khoi dong duoc MB Notify: '+error.message);process.exitCode=1;}
 });
 server.listen(port,'0.0.0.0',()=>{console.log('MB Notify: '+url+'\nServer dang chay nen. Dung stop.vbs de tat.');openPage();});
}
main().catch(error=>{require('./diagnostics').getLogger().log('fatal','startup_failed',{error});console.error(error.message);process.exitCode=1;});
