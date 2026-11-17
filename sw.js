// Private study pages and API responses are never cached by this worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{let message={};try{message=event.data.json()}catch{}event.waitUntil(self.registration.showNotification(message.title||'Thương IELTS',{body:message.body||'Đến giờ học tiếng Anh rồi Thương!',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:message.tag||'ielts-evening',data:{url:'/'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate('/');return client.focus()}}return self.clients.openWindow('/')})())});
