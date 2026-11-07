(function(root){
 function accountOf(e){
  const match=(e.text||'').match(/(?:\bTK\b|tài khoản)\s*:?\s*([0-9xX*•][0-9xX*•. -]{2,30})/i);
  return match?match[1].replace(/[. -]/g,'').replace(/[xX•]/g,'*'):'';
 }
 function accountGroups(events){
  const groups=new Map();
  for(const e of events){if(e.demo)continue;const key=accountOf(e);if(!groups.has(key))groups.set(key,{key,items:[]});groups.get(key).items.push(e);}
  return [...groups.values()].sort((a,b)=>a.key&&b.key?a.key.localeCompare(b.key):a.key?-1:b.key?1:0);
 }
 function transaction(e){
  const text=e.text||'',account=text.match(/(?:\bTK\b|tài khoản)\s*:?\s*([0-9][0-9xX*•. -]{2,30})/i);
  const match=text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  let at=Number(e.postedAt),source='Giờ thông báo trên điện thoại';
  if(match){const [,d,m,year,h,min,sec='0']=match,y=year.length===2?2000+Number(year):Number(year);const date=new Date(Date.UTC(y,+m-1,+d,+h-7,+min,+sec));const local=new Date(date.getTime()+7*3600000);if(local.getUTCFullYear()===y&&local.getUTCMonth()===+m-1&&local.getUTCDate()===+d&&+h<24&&+min<60&&+sec<60){at=date.getTime();source='Giờ giao dịch ghi trong thông báo MB Bank';}}
  if(!Number.isFinite(at)||at<=0){at=Date.parse(e.receivedAt);source='Giờ máy tính nhận thông báo (không tìm thấy giờ giao dịch)';}
  const dt=new Date(at+7*3600000),pad=n=>String(n).padStart(2,'0');
  const day=`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`;
  return {id:e.id,amount:e.amount,account:account?account[1].trim():'Không có trong thông báo',at,source,day,date:`${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth()+1)}/${dt.getUTCFullYear()}`,time:`${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`};
 }
 function filtered(events,start,end,account='all'){return events.filter(e=>!e.demo&&Number.isSafeInteger(e.amount)&&e.amount>0&&(account==='all'||accountOf(e)===account)).map(transaction).filter(t=>Number.isFinite(t.at)&&t.at>=start&&t.at<=end).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));}
 function bankText(list,unit,decimal='.'){if(!['dong','nghin'].includes(unit))throw Error('Chọn đơn vị BANK trước khi sao chép');return list.map(t=>String(t.amount/(unit==='nghin'?1000:1)).replace('.',decimal)).join('\r\n');}
 function shouldAlert(e,selected){return !!selected&&selected!=='all'&&!e.demo&&accountOf(e)===selected;}
 const api={transaction,filtered,bankText,accountOf,accountGroups,shouldAlert};if(typeof module!=='undefined')module.exports=api;else root.Transactions=api;
})(typeof window!=='undefined'?window:globalThis);
