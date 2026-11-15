'use strict';
const btn=document.getElementById('unsubscribe');
btn.addEventListener('click',async()=>{
  btn.disabled=true;
  const message=document.querySelector('[role=status]');
  try{
    const token=new URLSearchParams(location.search).get('token');
    if(!token)throw new Error('The unsubscribe token is missing.');
    const response=await fetch('/api/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error);
    message.textContent=data.message;
  }catch(e){message.textContent=e.message;btn.disabled=false;}
});
