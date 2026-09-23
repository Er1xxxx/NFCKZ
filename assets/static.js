(() => {
  'use strict';
  const cfg = window.NFC_CONFIG || {};
  const root = document.getElementById('dtr-app');
  const msg = document.getElementById('message');
  const money = n => new Intl.NumberFormat('ru-RU').format(n / 100) + ' ₸';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dishes = cfg.menu || [];
  let cart = JSON.parse(localStorage.getItem('nfc-cart') || '{}');
  let state = JSON.parse(localStorage.getItem('nfc-state') || 'null');
  let tab = 'menu', category = 'Все';
  const save = () => { localStorage.setItem('nfc-cart', JSON.stringify(cart)); localStorage.setItem('nfc-state', JSON.stringify(state)); };
  const totals = () => { const subtotal = dishes.filter(d => cart[d.id]).reduce((s,d) => s + d.price * cart[d.id], 0); const service = Math.round(subtotal * (cfg.servicePercent || 10) / 100); return {subtotal, service, total: subtotal + service}; };
  const notify = text => { msg.textContent = text; msg.hidden = !text; };
  const ensureState = () => state || (state = {status:'open',table:cfg.table || 7,orders:[],invoice:null,review:null});
  function render() {
    const t = ensureState();
    document.getElementById('restaurant-name').textContent = cfg.restaurantName || 'Dastarhan';
    document.getElementById('table-label').textContent = 'Стол ' + (cfg.table || 7);
    let html = '<section class="intro"><h1>К вашему столу</h1><p>Выберите блюда. Оплата — после еды.</p></section>';
    html += '<div class="banner">Демо-режим: заказы сохраняются на этом устройстве. Для отправки официантам подключите сервер Telegram.</div>';
    html += '<nav class="tabs"><button data-tab="menu" class="'+(tab==='menu'?'active':'')+'">Меню</button><button data-tab="bill" class="'+(tab==='bill'?'active':'')+'">Наш счёт</button><button data-help>Позвать официанта</button></nav>';
    if (tab === 'bill') {
      const all = t.orders || [], total = all.reduce((s,o) => s + o.items.reduce((n,i) => n + i.price*i.quantity,0),0), service = Math.round(total*(cfg.servicePercent||10)/100);
      html += '<section class="panel"><h2>Наш счёт</h2>' + (all.length ? all.map(o => '<article class="bill-order"><strong>Заказ №'+o.number+'</strong>'+o.items.map(i=>'<div class="row"><span>'+esc(i.name)+' × '+i.quantity+'</span><span>'+money(i.price*i.quantity)+'</span></div>').join('')+'</article>').join('') : '<p>Заказов пока нет.</p>');
      html += '<div class="row"><span>Блюда</span><span>'+money(total)+'</span></div><div class="row"><span>Обслуживание</span><span>'+money(service)+'</span></div><div class="row total"><span>Итого</span><span>'+money(total+service)+'</span></div>';
      if (t.status === 'open' && total) html += '<button class="primary wide" data-pay>Попросить счёт</button>';
      if (t.status === 'payment_pending') html += '<div class="banner">Счёт подготовлен. К оплате: <strong>'+money(t.invoice.total)+'</strong><br><a class="primary wide" href="'+esc(cfg.kaspiUrl||'#')+'" target="_blank" rel="noopener">Оплатить через Kaspi</a></div>';
      html += '</section>';
    } else {
      const cats = ['Все', ...new Set(dishes.map(d => d.category))];
      html += '<nav class="categories">'+cats.map(c=>'<button data-category="'+esc(c)+'" class="'+(category===c?'active':'')+'">'+esc(c)+'</button>').join('')+'</nav><div class="layout"><section class="dishes">';
      dishes.filter(d=>category==='Все'||d.category===category).forEach(d => { html += '<article class="dish">'+(d.image?'<img src="'+esc(d.image)+'" alt="'+esc(d.name)+'">':'<div class="dish-placeholder">✳</div>')+'<div class="dish-content"><span class="eyebrow">'+esc(d.category)+'</span><h2>'+esc(d.name)+'</h2><p>'+esc(d.description)+'</p><small>'+esc(d.weight)+'</small><div class="row"><strong>'+money(d.price)+'</strong><button data-add="'+d.id+'">+</button></div></div></article>'; });
      html += '</section><aside class="panel cart"><span class="eyebrow">К ВАШЕМУ СТОЛУ</span><h2>Ваш выбор</h2>';
      const lines = dishes.filter(d=>cart[d.id]); html += lines.length ? lines.map(d=>'<div class="cart-line"><strong>'+esc(d.name)+'</strong><div class="row"><span>'+money(d.price*cart[d.id])+'</span><span class="quantity"><button data-minus="'+d.id+'">−</button>'+cart[d.id]+'<button data-add="'+d.id+'">+</button></span></div></div>').join('') : '<p class="muted">Добавьте блюда в корзину.</p>';
      if (lines.length) html += '<label>Пожелания<textarea id="note" maxlength="300" placeholder="Например, без лука">'+esc(localStorage.getItem('nfc-note')||'')+'</textarea></label><button class="primary wide" data-order>Сохранить заказ</button>';
      html += '</aside></div>';
    }
    root.innerHTML = html;
  }
  root.addEventListener('input', e => { if (e.target.id === 'note') localStorage.setItem('nfc-note', e.target.value); });
  root.addEventListener('click', e => { const b=e.target.closest('button'); if(!b)return; if(b.dataset.tab){tab=b.dataset.tab;render();} else if(b.dataset.category){category=b.dataset.category;render();} else if(b.dataset.add){cart[b.dataset.add]=(cart[b.dataset.add]||0)+1;save();render();} else if(b.dataset.minus){cart[b.dataset.minus]=Math.max(0,(cart[b.dataset.minus]||0)-1);save();render();} else if(b.hasAttribute('data-order')){const lines=dishes.filter(d=>cart[d.id]).map(d=>({id:d.id,name:d.name,price:d.price,quantity:cart[d.id]}));state=ensureState();state.orders.push({number:state.orders.length+1,items:lines});cart={};save();tab='bill';notify('Заказ сохранён в демо-режиме.');render();} else if(b.hasAttribute('data-pay')){state=ensureState();state.status='payment_pending';state.invoice={total:totals().total};save();render();notify('Счёт подготовлен.');} else if(b.hasAttribute('data-help'))notify('Вызов официанта сохранён в демо-режиме.');});
  render();
})();
