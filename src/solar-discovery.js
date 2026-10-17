/* Public catalogue discovery only. No private/company endpoints, invented brands or listing claims. */
const SolarDiscovery = (() => {
  const categories = [
    {slug:'solar-panels',title:'Solar Panels',description:'Make electricity from sunlight.',search:'solar',art:'/assets/landing-solar-960.webp',photo:true},
    {slug:'inverters',title:'Solar Inverters',description:'Make solar electricity usable.',search:'inverter',art:'/assets/my-solar-solutions-logo.png'},
    {slug:'batteries',title:'Solar Batteries',description:'Store energy for later use.',search:'battery',art:'/assets/my-solar-solutions-logo.png'}
  ];
  const uuid = value => typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  const e = value => escapeHTML(value??'');
  let panel,controller,version=0,loading=false,cached=null,paused=false;
  function artwork(c) {
    return `<img class="ds-fallback ${c.photo?'ds-solar-art':'ds-brand-art'}" src="${c.art}" alt="" width="${c.photo?960:2091}" height="${c.photo?640:752}" decoding="async"><small class="ds-image-note">${c.photo?'Solar illustration':'Brand artwork'}</small>`;
  }
  function markup() {
    const desktop=matchMedia('(min-width: 1000px)').matches;
    return `<div class="ph-panel ds-panel" id="ph-panel-explore" aria-labelledby="ph-trigger-explore" hidden>
      <div class="ds-top"><div class="ds-intro"><p class="ds-eyebrow">DISCOVER SOLAR</p><h2>A brighter way to<br> power your world.</h2><p>Explore solar products, understand your options, and find the right starting point for your solar journey.</p><div class="ds-about"><h3>About solar</h3><p>Solar panels turn sunlight into electricity. An inverter makes it usable in your home or business. Batteries can store energy for later.</p></div></div>
      <div class="ds-categories" aria-label="Solar product categories">${categories.map(c=>`<a href="#/products?search=${c.search}" class="ds-category" data-ds-category="${c.slug}"><span class="ds-visual">${artwork(c)}</span><strong>${c.title}${icon('arrow')}</strong><span class="ds-category-description">${c.description}</span></a>`).join('')}<p class="ds-image-explanation">Published product images appear when supplied; otherwise existing illustrative or brand artwork is shown.</p></div></div>
      <details class="ds-support" ${desktop?'open':''}><summary>Understand solar systems & benefits <span aria-hidden="true">+</span></summary><section class="ds-systems" aria-labelledby="ds-systems-title"><h3 id="ds-systems-title">Which type of solar system?</h3><div>${[['On-Grid Solar','Works with your usual electricity connection (the grid).'],['Off-Grid Solar','Designed to work without a grid connection. Equipment must be chosen for your energy needs.'],['Hybrid Solar','Combines a grid connection with batteries or other compatible equipment, depending on the design.']].map(([title,description])=>`<article><h4>${title}</h4><p>${description}</p></article>`).join('')}</div></section>
      <ul class="ds-benefits" aria-label="Potential benefits of solar">${[['wallet','May reduce electricity bills'],['box','More control over your energy, depending on the system'],['leaf','Electricity from a renewable source'],['home','Options for different properties and energy needs']].map(([symbol,text])=>`<li>${icon(symbol)}<span>${text}</span></li>`).join('')}</ul><p class="ds-limits">Savings depend on your site, equipment and usage. Solar does not automatically provide power during a power cut. Ask your provider about suitable backup equipment.</p></details>
      <section class="ds-brands" aria-labelledby="ds-brands-title"><div class="ds-brand-heading"><h3 id="ds-brands-title">Brands powering your possibilities</h3><button type="button" data-ds-pause aria-controls="ds-brand-belt" aria-pressed="false" hidden>Pause brand motion</button></div><div data-ds-brands><p class="ds-brand-state">Brand names load from published catalogue records when you open this panel.</p></div></section>
      <div class="ds-footer"><div><p class="ds-status" data-ds-status role="status" aria-live="polite">Explore categories. Listings may be empty.</p><button type="button" class="ds-retry" data-ds-retry hidden>Try catalogue again</button></div>${link('/products','Explore All Solar Products '+icon('arrow'),'ds-marketplace')}</div>
    </div>`;
  }
  function safeImage(value) {
    if(typeof value!=='string'||value.length>500)return '';
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&/\.(png|jpe?g|webp)$/i.test(url.pathname)?url.href:'';}catch{return '';}
  }
  function products(value) {
    if(!Array.isArray(value?.items))throw new Error('Invalid public catalogue response.');
    return value.items.slice(0,30).filter(p=>p&&typeof p==='object').map(p=>({category_id:p.category_id,subcategory_id:p.subcategory_id,brand:typeof p.brand==='string'?p.brand.trim().slice(0,100):'',name:typeof p.name==='string'?p.name.slice(0,200):'Published product',image:(Array.isArray(p.image_urls)?p.image_urls:[]).map(safeImage).find(Boolean)||''}));
  }
  function activeCategories(value) {
    if(!Array.isArray(value?.categories))throw new Error('Invalid category response.');
    return value.categories.slice(0,200).filter(c=>c&&uuid(c.id)&&typeof c.slug==='string'&&c.kind==='product').map(c=>({id:c.id,slug:c.slug}));
  }
  function brandNames(items) {
    const names=new Map();
    items.forEach(p=>{if(p.brand&&!names.has(p.brand.toLocaleLowerCase()))names.set(p.brand.toLocaleLowerCase(),p.brand);});
    return [...names.values()].sort((a,b)=>a.localeCompare(b)).slice(0,12);
  }
  function paint(data) {
    if(!panel?.isConnected)return;
    categories.forEach(c=>{
      const anchor=panel.querySelector(`[data-ds-category="${c.slug}"]`),category=data.categories.find(item=>item.slug===c.slug);
      anchor.setAttribute('href','#/products?'+(category?'category='+category.id:'search='+c.search));
      const product=category?data.products.find(p=>(p.category_id===category.id||p.subcategory_id===category.id)&&p.image):null;
      const visual=anchor.querySelector('.ds-visual');
      visual.innerHTML=product?`<img class="ds-published-image" src="${e(product.image)}" alt="${e(product.name)} — image from a published listing" width="240" height="140" decoding="async" referrerpolicy="no-referrer"><small class="ds-image-note">Published listing image</small>`:artwork(c);
    });
    const brands=brandNames(data.products),slot=panel.querySelector('[data-ds-brands]'),motion=brands.length>=6;
    panel.querySelector('[data-ds-pause]').hidden=!motion;
    panel.querySelector('[data-ds-pause]').setAttribute('aria-pressed',String(paused));
    panel.querySelector('[data-ds-pause]').textContent=paused?'Resume brand motion':'Pause brand motion';
    if(brands.length){
      const first=brands.map(name=>link('/products?brand='+encodeURIComponent(name),e(name),'ds-brand')).join('');
      const duplicate=motion?`<div class="ds-sequence" aria-hidden="true" inert>${brands.map(name=>`<span class="ds-brand">${e(name)}</span>`).join('')}</div>`:'';
      slot.innerHTML=`<div class="ds-belt ${motion?'ds-marquee':''} ${paused?'ds-paused':''}" id="ds-brand-belt" data-ds-belt role="region" aria-label="Brand names from published catalogue listings" tabindex="0"><div class="ds-track"><div class="ds-sequence">${first}</div>${duplicate}</div></div><p class="ds-brand-note">Names from a sample of published listings. No partnership, popularity ranking or endorsement is implied.</p>`;
      const belt=slot.querySelector('.ds-belt');
      if(motion&&belt.clientWidth&&slot.querySelector('.ds-sequence').getBoundingClientRect().width<belt.clientWidth*1.1){belt.classList.remove('ds-marquee');slot.querySelector('.ds-sequence[aria-hidden]')?.remove();panel.querySelector('[data-ds-pause]').hidden=true;}
    }else slot.innerHTML=`<p class="ds-brand-state">${data.productError?'Brand information could not be loaded.':'No brand names are supplied in the loaded public catalogue.'}</p>`;
    panel.querySelector('[data-ds-status]').textContent=data.categoryError||data.productError?'Some catalogue information is unavailable. The marketplace links remain available.':'Explore the public catalogue. Category searches may have no published listings.';
    panel.querySelector('[data-ds-retry]').hidden=!(data.categoryError||data.productError);
    panel.removeAttribute('aria-busy');
  }
  async function load(force=false) {
    if(!panel||loading)return;
    if(!force&&cached&&Date.now()-cached.at<20000){paint(cached);return;}
    const epoch=version;loading=true;
    panel.setAttribute('aria-busy','true');panel.querySelector('[data-ds-status]').textContent='Loading public catalogue images and brands…';
    // These are the same read-only endpoints used by the marketplace, with no tenant/private context.
    const results=await Promise.allSettled([Account.api('/public/categories?page=1').then(activeCategories),Account.api('/public/products?kind=product&page=1').then(products)]);
    if(epoch!==version)return;
    const data={categories:results[0].status==='fulfilled'?results[0].value:[],products:results[1].status==='fulfilled'?results[1].value:[],categoryError:results[0].status==='rejected',productError:results[1].status==='rejected',at:Date.now()};
    // Up to three bounded category samples find images even when the first global page misses a category.
    const missing=categories.map(c=>data.categories.find(item=>item.slug===c.slug)).filter(c=>c&&!data.products.some(p=>(p.category_id===c.id||p.subcategory_id===c.id)&&p.image));
    const samples=await Promise.allSettled(missing.map(c=>Account.api('/public/products?category='+c.id+'&page=1').then(products)));
    if(epoch!==version)return;
    samples.forEach(result=>{if(result.status==='fulfilled')data.products.push(...result.value);});
    cached=data;loading=false;paint(data);
  }
  function cleanup() {version++;controller?.abort();controller=null;panel=null;loading=false;}
  function mount() {
    cleanup();panel=document.getElementById('ph-panel-explore');if(!panel)return;
    controller=new AbortController();const {signal}=controller;
    panel.addEventListener('click',event=>{
      const pause=event.target.closest('[data-ds-pause]');
      if(pause){paused=!paused;panel.querySelector('.ds-belt')?.classList.toggle('ds-paused',paused);pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume brand motion':'Pause brand motion';}
      if(event.target.closest('[data-ds-retry]'))void load(true);
    },{signal});
    panel.addEventListener('error',event=>{
      const image=event.target;
      if(!image.matches?.('.ds-published-image'))return;
      const card=image.closest('[data-ds-category]'),c=categories.find(item=>item.slug===card.dataset.dsCategory);
      card.querySelector('.ds-visual').innerHTML=artwork(c);
    },{capture:true,signal});
    const breakpoint=matchMedia('(min-width: 1000px)');
    breakpoint.addEventListener('change',()=>{panel.querySelector('.ds-support').open=breakpoint.matches;if(cached&&!panel.hidden)paint(cached);},{signal});
  }
  return {markup,mount,cleanup,open:()=>{void load();}};
})();
