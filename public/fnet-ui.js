(function(){
 const byId=id=>document.getElementById(id);
 let current=null,initialized=false,sourceConnected=true,savingDebt=false;
 const seen=new Set();
 const debtMoney=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value);
 function machineLabel(name){const machine=current?.machines?.find(m=>m.name===name);return name+' · '+(machine?.user?.trim()||'Không có TK đang chơi');}
 function playerLabel(machine,debt){return machine?.user?.trim()?'TK: '+machine.user.trim():debt?.user?'TK lúc ghi nợ: '+debt.user:'Chưa có tên tài khoản';}
 let watchCollapsed=localStorage.getItem('fnet-watch-collapsed')==='1',watchSignature='',watchSaving=false,watchOriginalAmount=null;
 function minutes(value){const m=String(value||'').match(/^(\d+):(\d{2})(?::(\d{2}))?$/);return m&&+m[2]<60&&(!m[3]||+m[3]<60)?+m[1]*60 + +m[2]+ +(m[3]||0)/60:null;}
 function watchStale(){return !sourceConnected||!current||current.status!=='online'||!current.updatedAt||Date.now()-Date.parse(current.updatedAt)>20000;}
 function watchState(debt){const machine=current?.machines?.find(m=>m.name===debt.machine),left=minutes(machine?.remaining),stale=watchStale();return {machine,left,tone:stale?'stale':!machine?'unknown':machine.state==='offline'?'danger':machine.state==='online'&&left!==null&&left<=30?'warning':'normal'};}
 function renderWatch(){
  const debts=current?.debts||[],stale=watchStale(),items=debts.map(debt=>({debt,...watchState(debt)})),priority={danger:0,warning:1,unknown:2,stale:3,normal:4};items.sort((a,b)=>priority[a.tone]-priority[b.tone]||(a.left??Infinity)-(b.left??Infinity)||a.debt.machine.localeCompare(b.debt.machine,'vi',{numeric:true}));
  const urgent=items.filter(x=>['danger','warning'].includes(x.tone)).length,signature=JSON.stringify({items,stale,watchCollapsed});if(signature===watchSignature)return;watchSignature=signature;
  byId('watch-count').textContent=debts.length;byId('watch-summary').textContent=debts.length?debtMoney(debts.reduce((sum,d)=>sum+d.amount,0))+' chưa thu'+(stale?' · dữ liệu cũ':urgent?' · '+urgent+' máy cần chú ý':''):'Chưa có máy gắn flag · thêm máy để theo dõi tại mọi tab';
  byId('watch-panel').className='watch-panel'+(urgent?' has-urgent':'')+(watchCollapsed?' is-collapsed':'');byId('watch-toggle').textContent=watchCollapsed?'Mở danh sách':'Thu gọn';byId('watch-toggle').setAttribute('aria-expanded',String(!watchCollapsed));byId('watch-cards').hidden=watchCollapsed;
  byId('watch-source').hidden=!stale||watchCollapsed;byId('watch-source').textContent='Chưa có dữ liệu FNet mới. '+(current?.updatedAt?'Lần đọc cuối: '+new Date(current.updatedAt).toLocaleTimeString('vi-VN')+'. Đang giữ thông tin cũ.':'Đang chờ FNet kết nối.');
  const box=byId('watch-cards'),focused=box.contains(document.activeElement)?document.activeElement.dataset.machine:null;box.replaceChildren();
  for(const item of items){const {debt,machine,tone}=item,card=document.createElement('button');card.type='button';card.className='watch-card '+tone;card.dataset.machine=debt.machine;card.setAttribute('aria-label',debt.machine+' · nợ '+debtMoney(debt.amount)+' · xem và xử lý');
   const head=document.createElement('span'),name=document.createElement('b'),state=document.createElement('span'),player=document.createElement('span'),amount=document.createElement('strong'),detail=document.createElement('span'),note=document.createElement('small');head.className='watch-card-head';name.textContent=debt.machine;state.className='watch-state';state.textContent=tone==='stale'?'Dữ liệu cũ':tone==='danger'?'Mất kết nối':tone==='warning'?'Sắp hết giờ':tone==='unknown'?'Chưa thấy máy':machine?.status||'Chưa rõ';head.append(name,state);player.className='watch-user';player.textContent=playerLabel(machine,debt);card.setAttribute('aria-label',debt.machine+' · '+player.textContent+' · nợ '+debtMoney(debt.amount));amount.textContent=debtMoney(debt.amount);detail.className='watch-remaining';detail.textContent=machine?.remaining?'Còn lại '+machine.remaining:'Còn lại —';note.textContent=debt.note||'Bấm để chỉnh sửa / xác nhận đã thu';card.append(head,player,amount,detail,note);card.onclick=()=>openWatch(debt.machine);box.append(card);
  }
  if(focused)[...box.children].find(b=>b.dataset.machine===focused)?.focus({preventScroll:true});
 }
 function fillWatch(machine){const debt=current?.debts?.find(d=>d.machine===machine);watchOriginalAmount=debt?.amount??null;byId('watch-dialog-title').textContent=machine?'Thu tiền / chỉnh flag · '+machine:'Gắn flag máy chưa trả tiền';byId('watch-machine').value=machine;byId('watch-amount').value=debt?debt.amount/1000:'';byId('watch-note').value=debt?.note||'';byId('watch-paid').hidden=!debt;byId('watch-paid').textContent=debt?'Đã thu đủ '+debtMoney(debt.amount)+' · bỏ flag':'Đã thu đủ · bỏ flag';byId('watch-result').textContent='';watchMachineStatus();}
 function watchMachineStatus(){for(const option of byId('watch-machine').options)if(option.value)option.textContent=machineLabel(option.value);const name=byId('watch-machine').value,machine=current?.machines?.find(m=>m.name===name);byId('watch-machine-status').textContent=!name?'Chọn máy và nhập số tiền cần thu.':machineLabel(name)+' · '+(watchStale()?'Dữ liệu FNet cũ · ': '')+(machine?machine.status+' · Còn lại '+(machine.remaining||'chưa rõ'):'Chưa có thông tin máy trong lần đọc hiện tại');}
 function openWatch(machine=''){if(watchSaving)return;const select=byId('watch-machine'),names=[...new Set([...(current?.machines||[]).map(m=>m.name),...(current?.debts||[]).map(d=>d.machine)])].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Chọn máy…';select.append(empty);for(const name of names){const option=document.createElement('option');option.value=name;option.textContent=machineLabel(name);select.append(option);}fillWatch(machine);byId('watch-dialog-title').textContent=machine?'Thu tiền / chỉnh flag · '+machine:'Gắn flag máy chưa trả tiền';byId('watch-dialog').showModal();if(machine)byId('watch-amount').focus();else select.focus();}
 function setWatchSaving(value){watchSaving=value;for(const id of ['watch-machine','watch-amount','watch-note','watch-save','watch-paid','watch-close'])byId(id).disabled=value;}
 async function writeWatch(amount){const machine=byId('watch-machine').value,note=byId('watch-note').value;if(!machine)throw Error('Chọn máy trước khi lưu.');if(!config)throw Error('Chưa kết nối máy chủ');const res=await fetch('/api/fnet/debt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.token},signal:AbortSignal.timeout(5000),body:JSON.stringify({machine,amount,note})});const data=await res.json();if(!res.ok)throw Error(data.error||'Chưa lưu được ghi nợ');window.FnetUI.update(data);if(byId('debt-machine').value===machine)fillDebt(machine);byId('watch-dialog').close();notify(amount?'Đã lưu flag '+machine+' · '+debtMoney(amount):'Đã đánh dấu '+machine+' thu đủ và bỏ flag.');}
 byId('watch-toggle').onclick=()=>{watchCollapsed=!watchCollapsed;localStorage.setItem('fnet-watch-collapsed',watchCollapsed?'1':'0');renderWatch();};byId('watch-add').onclick=()=>openWatch();byId('watch-close').onclick=()=>byId('watch-dialog').close();byId('watch-machine').onchange=()=>fillWatch(byId('watch-machine').value);
 byId('watch-form').onsubmit=async e=>{e.preventDefault();if(watchSaving)return;const amount=Math.round(Number(byId('watch-amount').value)*1000);if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999999){byId('watch-result').textContent='Nhập số tiền theo nghìn đồng lớn hơn 0 (50 = 50.000đ).';return;}setWatchSaving(true);try{await writeWatch(amount);}catch(error){byId('watch-result').textContent=error.message;}finally{setWatchSaving(false);}};
 byId('watch-paid').onclick=async()=>{if(watchSaving)return;const name=byId('watch-machine').value,debt=current?.debts?.find(d=>d.machine===name);if(!debt||debt.amount!==watchOriginalAmount){fillWatch(name);byId('watch-result').textContent='Ghi nợ vừa thay đổi. Kiểm tra số tiền mới trước khi xác nhận đã thu.';return;}setWatchSaving(true);try{await writeWatch(0);}catch(error){byId('watch-result').textContent=error.message;}finally{setWatchSaving(false);}};
 byId('watch-dialog').addEventListener('cancel',e=>{if(watchSaving)e.preventDefault();});
 function saving(value){savingDebt=value;for(const id of ['debt-machine','debt-amount','debt-note','debt-save'])byId(id).disabled=value;byId('debt-paid').disabled=value||!current?.debts?.some(d=>d.machine===byId('debt-machine').value);}
 function fillDebt(machine){
  byId('debt-machine').value=machine;
  const debt=current?.debts?.find(d=>d.machine===machine);
  byId('debt-amount').value=debt?debt.amount/1000:'';byId('debt-note').value=debt?.note||'';byId('debt-paid').disabled=savingDebt||!debt;
 }
 async function saveDebt(amount){
  if(!config)throw Error('Chưa kết nối máy chủ');
  const machine=byId('debt-machine').value;
  const response=await fetch('/api/fnet/debt',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.token},signal:AbortSignal.timeout(5000),body:JSON.stringify({machine,amount,note:byId('debt-note').value})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Chưa lưu được ghi nợ');
  window.FnetUI.update(data);if(byId('debt-machine').value===machine)fillDebt(machine);
  byId('debt-result').textContent=amount?'Đã lưu '+machine+' · còn nợ '+debtMoney(amount):'Đã đánh dấu trả hết và bỏ flag '+machine;
 }
 function renderDebts(){
  const debts=current.debts||[],select=byId('debt-machine'),selected=select.value;
  const names=[...new Set([...(current.machines||[]).map(m=>m.name),...debts.map(d=>d.machine),...(selected?[selected]:[])])].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
  select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Chọn máy…';select.append(empty);
  for(const machine of names){const option=document.createElement('option');option.value=machine;option.textContent=machineLabel(machine)+(debts.some(d=>d.machine===machine)?' · chưa trả tiền':'');select.append(option);}select.value=selected;
  byId('debt-paid').disabled=savingDebt||!debts.some(d=>d.machine===selected);
  byId('debt-total').textContent=debts.length+' máy · '+debtMoney(debts.reduce((sum,d)=>sum+d.amount,0));
  const box=byId('debt-list');box.replaceChildren();
  if(!debts.length){const p=document.createElement('p');p.className='hint';p.textContent='Chưa có máy được gắn flag.';box.append(p);}
  for(const debt of [...debts].sort((a,b)=>a.machine.localeCompare(b.machine,'vi',{numeric:true}))){
   const machine=current.machines.find(m=>m.name===debt.machine),card=document.createElement('article');card.className='debt-card'+(machine?.state==='offline'?' is-offline':'');
   const title=document.createElement('b'),amount=document.createElement('strong'),detail=document.createElement('p'),note=document.createElement('p'),edit=document.createElement('button');
   title.textContent='⚑ '+debt.machine;amount.textContent=debtMoney(debt.amount);detail.textContent=machine?machine.status+' · Còn lại '+(machine.remaining||'chưa rõ'):'Không có trong lần đọc FNet hiện tại';note.textContent=[debt.user&&'Lúc ghi nợ: '+debt.user,debt.note].filter(Boolean).join(' · ');edit.type='button';edit.textContent='Chỉnh sửa';edit.onclick=()=>{fillDebt(debt.machine);byId('debt-amount').focus();};const player=document.createElement('div');player.className='debt-user';player.textContent=playerLabel(machine,debt);card.append(title,player,amount,detail,note,edit);box.append(card);
  }
 }
 function renderSource(){
  renderWatch();if(byId('watch-dialog').open)watchMachineStatus();
  if(!current)return;
  const stale=!sourceConnected||(current.updatedAt&&Date.now()-Date.parse(current.updatedAt)>20000);
  byId('fnet-source').textContent=current.status==='online'?(stale?'Dữ liệu FNet cũ · chờ cập nhật':'Đang đọc FNet · mỗi 5 giây'):current.status==='error'?'Không đọc được FNet':'Đang chờ FNet…';
  byId('fnet-source').className='badge '+(current.status==='online'&&!stale?'online':'warning');
 }
 function cell(row,text){const td=document.createElement('td');td.textContent=text||'—';row.append(td);return td;}
 function render(){
  if(!current)return;
  const machines=current.machines||[],alerts=(current.alerts||[]).filter(a=>['debt-low','debt-offline'].includes(a.type)),offline=machines.filter(m=>m.state==='offline').length,unread=alerts.filter(a=>!a.acknowledged&&(current.debts||[]).some(d=>d.machine===a.machine)).length;
  byId('fnet-count').textContent=unread||machines.length;
  byId('fnet-total').textContent=machines.length;byId('fnet-online').textContent=machines.filter(m=>m.state==='online').length;byId('fnet-offline').textContent=offline;byId('fnet-unread').textContent=unread;
  renderSource();
  byId('fnet-error').hidden=!current.error&&!current.storageError&&!current.debtStorageError;
  byId('fnet-error').textContent=[current.error,current.storageError,current.debtStorageError].filter(Boolean).join(' ')+(current.updatedAt&&current.status!=='online'?' Đang hiển thị dữ liệu cũ.':'');
  renderDebts();
  byId('fnet-updated').textContent=current.updatedAt?'Đọc thành công: '+new Date(current.updatedAt).toLocaleString('vi-VN'):'';
  const box=byId('fnet-alerts');box.replaceChildren();
  if(!alerts.length){const p=document.createElement('p');p.className='hint';p.textContent='Chưa có cảnh báo cho máy được gắn flag.';box.append(p);}
  for(const alert of alerts){
   const article=document.createElement('article');article.className='fnet-alert'+(alert.acknowledged?' acknowledged':'');
   const text=document.createElement('div'),title=document.createElement('b'),detail=document.createElement('p');
   title.textContent=alert.message;detail.textContent=new Date(alert.at).toLocaleString('vi-VN')+(alert.user?' · Người dùng trước đó: '+alert.user:'')+' · Trước đó: '+alert.previousStatus;
   text.append(title,detail);article.append(text);
   if(!alert.acknowledged){const button=document.createElement('button');button.textContent='Đã xem';button.onclick=async()=>{
    button.disabled=true;
    try{if(!config)throw Error('Chưa kết nối máy chủ');const res=await fetch('/api/fnet/ack/'+encodeURIComponent(alert.id),{method:'POST',headers:{Authorization:'Bearer '+config.token},signal:AbortSignal.timeout(4000)});if(!res.ok)throw Error('Chưa lưu được xác nhận');alert.acknowledged=true;render();}catch(error){notify(error.message);button.disabled=false;}
   };article.append(button);}else{const span=document.createElement('span');span.className='meta';span.textContent='Đã xem';article.append(span);}
   box.append(article);
  }
  const query=byId('fnet-search').value.trim().toLocaleLowerCase('vi'),filter=byId('fnet-filter').value,body=byId('fnet-body');
  const expanded=new Set([...body.querySelectorAll('details[open] summary')].map(e=>e.textContent));body.replaceChildren();
  const visible=machines.filter(m=>(filter==='all'||m.state===filter||(filter==='flagged'&&current.debts?.some(d=>d.machine===m.name)))&&[m.name,m.user,m.ip,m.group].join(' ').toLocaleLowerCase('vi').includes(query));
  for(const machine of visible){
   const tr=document.createElement('tr');tr.className='is-'+machine.state;
   const debt=current.debts?.find(d=>d.machine===machine.name);if(debt)tr.classList.add('has-debt');
   const name=cell(tr,''),details=document.createElement('details'),summary=document.createElement('summary'),info=document.createElement('span');name.replaceChildren();summary.textContent=machine.name;details.open=expanded.has(machine.name);info.textContent=[machine.note&&'Ghi chú: '+machine.note,machine.combo&&'COMBO: '+machine.combo,machine.day&&'Ngày: '+machine.day,machine.version&&'Phiên bản: '+machine.version].filter(Boolean).join(' · ')||'Không có thông tin bổ sung';details.append(summary,info);name.append(details);
   const status=cell(tr,''),chip=document.createElement('span');status.replaceChildren();chip.className='machine-state';chip.textContent=machine.status;status.append(chip);
   if(debt){const marker=document.createElement('small');marker.className='debt-marker';marker.textContent='⚑ Nợ '+debtMoney(debt.amount);name.append(marker);}
   for(const value of [machine.user,machine.started,machine.used,machine.remaining,machine.amount])cell(tr,value);
   const extra=cell(tr,machine.ip),group=document.createElement('small');group.textContent=machine.group;extra.append(group);body.append(tr);
  }
  if(!visible.length){const tr=document.createElement('tr'),td=cell(tr,machines.length?'Không có máy khớp bộ lọc.':'Chưa có dữ liệu máy từ FNet.');td.colSpan=8;td.className='empty';body.append(tr);}
 }
 byId('fnet-search').oninput=render;byId('fnet-filter').onchange=render;
 byId('debt-machine').onchange=()=>{fillDebt(byId('debt-machine').value);byId('debt-result').textContent='';};
 byId('debt-form').onsubmit=async event=>{event.preventDefault();if(savingDebt)return;const amount=Math.round(Number(byId('debt-amount').value)*1000);if(!byId('debt-machine').value||!Number.isSafeInteger(amount)||amount<=0){byId('debt-result').textContent='Chọn máy và nhập tiền theo nghìn đồng (50 = 50.000đ).';return;}saving(true);try{await saveDebt(amount);}catch(error){byId('debt-result').textContent=error.message;}finally{saving(false);}};
 byId('debt-paid').onclick=async()=>{if(savingDebt)return;saving(true);try{await saveDebt(0);}catch(error){byId('debt-result').textContent=error.message;}finally{saving(false);}};
 window.FnetUI={connection(available){sourceConnected=available;renderSource();},update(data){
  if(!data)return;
  if(current?.checkedAt&&data.checkedAt&&Date.parse(data.checkedAt)<Date.parse(current.checkedAt))return;
  const fresh=(data.alerts||[]).filter(a=>['debt-low','debt-offline'].includes(a.type)&&(data.debts||[]).some(d=>d.machine===a.machine)&&!seen.has(a.id)&&!a.acknowledged);
  for(const alert of data.alerts||[])seen.add(alert.id);
  current=data;render();
  if(initialized&&fresh.length){const text=fresh.map(a=>a.message).join('\n');notify(text);alertFnetEvent({demo:false,title:'FNet · Cảnh báo máy / chưa trả tiền',text});}
  initialized=true;
 }};
})();
