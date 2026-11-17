if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();installPrompt=event;
  const button=document.createElement('button');button.className='btn btn-green btn-small';button.textContent='Cài Thương IELTS';button.style.cssText='position:fixed;right:16px;bottom:82px;z-index:20';
  button.onclick=async()=>{await installPrompt.prompt();const result=await installPrompt.userChoice;if(result.outcome==='accepted')button.remove();installPrompt=null;button.remove()};document.body.append(button);
});
