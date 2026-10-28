/* Public marketing experience. Preview content never reads private workspace data. */
const Landing = (() => {
  let controller;
  let observer;
  let frame = 0;
  let flyingPiece = null;
  const arrow = () => icon('arrow');
  const cta = (path, label, kind = '') => link(path, `${label}${arrow()}`, `lp-button ${kind}`);
  const sectionLink = (id, label) => `<a href="#/?section=${id}" data-lp-scroll="${id}">${label}</a>`;
  const categories = [
    { name: 'Solar panels', key: 'panels', label: 'CAPTURE THE POSSIBILITY', title: 'It starts with sunlight.', text: 'Explore published panel specifications. Compare the manufacturer, model, capacity and warranty information that has actually been supplied.', search: 'solar', symbol: 'sun' },
    { name: 'Inverters', key: 'inverters', label: 'MAKE ENERGY WORK', title: 'The connection that matters.', text: 'Understand inverter options and compare published specifications. Ask your distributor to confirm compatibility with your proposed system.', search: 'inverter', symbol: 'wallet' },
    { name: 'Batteries', key: 'batteries', label: 'EXPLORE ENERGY STORAGE', title: 'Think beyond the daylight.', text: 'Discover storage options where published. Capacity, compatibility, warranty and installation requirements should be confirmed with the supplier.', search: 'battery', symbol: 'box' },
    { name: 'Mounting systems', key: 'mounting', label: 'BUILD ON THE RIGHT FOUNDATION', title: 'Every roof is different.', text: 'Explore mounting equipment where listed. A qualified installer should assess the site and confirm the structure and installation requirements.', search: 'mounting', symbol: 'tool' },
    { name: 'Solar equipment', key: 'equipment', label: 'THE DETAILS THAT CONNECT IT ALL', title: 'Complete the bigger picture.', text: 'Browse published energy equipment and accessories. Confirm the scope, specifications and inclusions before requesting a quotation.', search: 'equipment', symbol: 'box' },
    { name: 'Service providers', key: 'services', label: 'PEOPLE BEHIND THE PROGRESS', title: 'Find your next conversation.', text: 'Explore published distributor profiles and their declared service areas. Discuss your requirements directly; a listing is not an independent certification.', path: '/vendors', symbol: 'users' }
  ];
  const previews = {
    enquiries: { title: 'Give every conversation a next step.', description: 'Keep customer requirements, follow-ups and ownership together.', columns: ['Enquiry', 'Next step', 'Stage'], rows: [['Rooftop enquiry', 'Confirm site details', 'New'], ['Storage enquiry', 'Clarify requirements', 'Follow-up'], ['Installation enquiry', 'Review service area', 'Review']] },
    quotations: { title: 'Clarity before a commitment.', description: 'Prepare quotations with a clear scope, equipment and terms.', columns: ['Quotation', 'Next step', 'Stage'], rows: [['Equipment proposal', 'Confirm specifications', 'Draft'], ['Installation proposal', 'Review inclusions', 'Draft'], ['Revised proposal', 'Review customer questions', 'Review']] },
    projects: { title: 'Keep the next milestone in sight.', description: 'Coordinate projects, assigned work and installation progress.', columns: ['Project', 'Next step', 'Stage'], rows: [['Rooftop project', 'Record site assessment', 'Planning'], ['Installation project', 'Assign field task', 'Scheduling'], ['Service request', 'Prepare an update', 'Open']] }
  };

  function header() { return PublicHeader.markup(); }

  function footer() {
    return `<footer class="lp-footer"><div class="lp-wrap"><div class="lp-footer-grid"><div class="lp-footer-brand">${link('/', brand(), 'brand')}<p>A shared platform for the people choosing solar and the businesses making it happen.</p><span>Technology by AIRA Labs</span></div><nav aria-label="Explore solar footer"><h2>Explore solar</h2>${link('/products', 'Products & equipment')}${link('/vendors', 'Find a distributor')}${link('/customer', 'For customers')}</nav><nav aria-label="For business footer"><h2>For businesses</h2>${link('/distributor', 'Discover the platform')}${link('/distributor/onboarding', 'Set up your company')}${link('/distributor/login', 'Business sign in')}</nav><nav aria-label="Your account footer"><h2>Your next step</h2>${link('/register', 'Create an account')}${link('/customer/login', 'Customer sign in')}${link('/customer/sia', 'Meet SIA')}${link('/app-info', 'App & offline information')}</nav></div><div class="lp-footer-bottom"><span>© ${new Date().getFullYear()} MY SOLAR</span><span>One connected solar ecosystem.</span><a href="/privacy">Privacy draft</a><a href="/terms">Terms draft</a><a href="/support">Support</a><a href="/catalogue">Public catalogue</a><a href="#/?section=top" data-lp-scroll="top">Back to top ↑</a></div></div></footer>`;
  }

  function equipment(key) {
    if (key === 'panels') return `<div class="lp-panel-slot"></div>`;
    return `<div class="lp-equipment-symbol lp-equipment-${key}">${icon(categories.find(c => c.key === key).symbol)}<span></span><i></i></div>`;
  }

  function categoryContent(c) {
    return `<div class="lp-category-art">${equipment(c.key)}<span>Category illustration · not a product listing</span></div><div class="lp-category-copy"><p class="lp-kicker">${c.label}</p><h3>${c.title}</h3><p>${c.text}</p>${cta(c.path || '/products?search=' + encodeURIComponent(c.search), c.path ? 'Explore distributors' : 'Explore ' + c.name.toLowerCase(), 'lp-button-outline')}<small>Published listings only. No price or availability is implied.</small></div>`;
  }

  function previewContent(key) {
    const p = previews[key];
    return `<div class="lp-preview-heading"><span>YOUR BUSINESS / ${key.toUpperCase()}</span><h3>${p.title}</h3><p>${p.description}</p></div><div class="lp-preview-table" role="table" aria-label="Fictional ${key} workflow preview"><div class="lp-preview-row lp-preview-labels" role="row">${p.columns.map(c => `<span role="columnheader">${c}</span>`).join('')}</div>${p.rows.map(r => `<div class="lp-preview-row" role="row"><strong role="cell">${r[0]}<small>Example record</small></strong><span role="cell">${r[1]}</span><span role="cell"><b>${r[2]}</b></span></div>`).join('')}</div><p class="lp-preview-note">Illustrative workspace · Fictional records · No business actions are performed.</p>`;
  }

  function page() {
    return `<div class="lp-page" id="lp-top">
      <div class="lp-behind-sky" aria-hidden="true">${[[-8,6,13,'b',.32],[58,2,15,'a',.28],[12,24,10,'a',.22],[76,30,12,'b',.26],[-6,52,14,'a',.24],[42,58,10,'b',.2],[68,74,13,'b',.24],[4,78,11,'a',.2]].map(([left, top, width, kind, fade]) => `<img class="lp-behind-cloud" src="/assets/hero-cloud-${kind}.png" alt="" style="left:${left}%;top:${top}%;--lp-cloud-w:${width}%;--lp-cloud-fade:${fade}">`).join('')}</div>
      <section class="lp-hero lp-hero-stage" aria-labelledby="lp-hero-title">
        <div class="lp-hero-pin">
          <div class="lp-sky-still" aria-hidden="true">${[[-8,46,18,'b',.78],[84,44,16,'a',.72],[2,64,15,'a',.66],[78,68,16,'b',.62],[-4,78,14,'b',.55],[70,82,14,'a',.5]].map(([left, top, width, kind, fade]) => `<img class="lp-sky-cloud" src="/assets/hero-cloud-${kind}.png" alt="" style="left:${left}%;top:${top}%;--lp-cloud-w:${width}%;--lp-cloud-fade:${fade}">`).join('')}</div>
          <div class="lp-hero-copy">
            <h1 id="lp-hero-title" class="lp-hero-mark">MY SOLAR</h1>
            <p class="lp-hero-sub">Powering every possibility. <em>Together.</em></p>
          </div>
          <div class="lp-cloud-bed" aria-hidden="true">${[[-18,0,80],[16,-4,88],[46,2,76],[-12,18,60],[30,20,72],[58,14,58]].map(([left, bottom, width]) => `<img class="lp-bed-cloud" src="/assets/hero-cloud-b.png" alt="" style="left:${left}%;bottom:${bottom}%;--lp-cloud-w:${width}%">`).join('')}</div>
          <img class="lp-hero-island" src="/assets/hero-island.png" width="1024" height="682" alt="" fetchpriority="high" decoding="async">
          <img class="lp-panel-piece" src="/assets/hero-panel-piece.png" width="700" height="336" alt="">
          <div class="lp-cloud-veil" aria-hidden="true">${[[-24,12,-1,52,'a'],[-18,34,-1,48,'b'],[-12,46,-1,44,'a'],[68,6,1,46,'a'],[66,26,1,46,'b'],[64,40,1,46,'a'],[-8,66,-1,38,'a'],[66,56,1,44,'a'],[-8,-6,-1,36,'a'],[70,-8,1,40,'a']].map(([left, top, dir, width, kind], index) => `<img class="lp-cloud" src="/assets/hero-cloud-${kind}.png" alt="" style="left:${left}%;top:${top}%;--lp-cloud-w:${width}%" data-dir="${dir}" data-flip="${index % 2 ? -1 : 1}">`).join('')}</div>
        </div>
      </section>
      <section class="lp-discovery lp-section" id="lp-discovery" aria-labelledby="lp-discovery-title"><div class="lp-wrap"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">THE BUILDING BLOCKS OF BETTER ENERGY</p><h2 id="lp-discovery-title">A world of solar.<br><em>A clearer starting point.</em></h2></div>${link('/products', 'Browse the catalogue ' + arrow(), 'lp-text-link')}</div><div class="lp-category-tabs" role="tablist" aria-label="Explore energy categories">${categories.map((c, i) => `<button type="button" id="lp-category-${c.key}" role="tab" aria-selected="${i === 0}" aria-controls="lp-category-panel" tabindex="${i === 0 ? '0' : '-1'}" data-lp-category="${c.key}">${c.name}</button>`).join('')}</div><div id="lp-category-panel" class="lp-category-panel" role="tabpanel" aria-labelledby="lp-category-panels" tabindex="0">${categoryContent(categories[0])}</div></div></section>
      <div class="lp-intro-strip"><div class="lp-wrap"><span>CHOOSE SOLAR. BUILD POSSIBILITIES.</span><p>For homes. For businesses. <strong>For a brighter everyday.</strong></p>${icon('sun')}</div></div>
      <section class="lp-section lp-audiences lp-wrap" id="lp-audiences" aria-labelledby="lp-audiences-title"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">YOUR PLACE IN THE BIGGER PICTURE</p><h2 id="lp-audiences-title">Different journeys.<br><em>One solar ecosystem.</em></h2></div><p>Whether you’re choosing solar or building a business around it, there’s a place for you here.</p></div>
        <div class="lp-audience-grid"><a href="#/customer" class="lp-audience lp-audience-customer" data-lp-reveal><img src="/assets/landing-solar-960.webp" width="960" height="640" loading="lazy" decoding="async" alt=""><div class="lp-audience-overlay"></div><div class="lp-audience-top"><span>01 / FOR CUSTOMERS</span><span class="lp-circle-arrow">${arrow()}</span></div><div class="lp-audience-bottom"><h3>A new outlook<br>starts at home.</h3><p>Explore products, connect with distributors and compare quotations.</p><span>Start your solar journey ${arrow()}</span></div></a>
        <a href="#/distributor" class="lp-audience lp-audience-installer" data-lp-reveal><div class="lp-audience-top"><span>02 / FOR INSTALLERS & EPCs</span><span class="lp-circle-arrow">${arrow()}</span></div><div class="lp-roof-lines" aria-hidden="true"></div><div class="lp-audience-bottom"><h3>Good work.<br>Better connected.</h3><p>Bring projects, field tasks and installation milestones into one workspace.</p><span>Explore the business platform ${arrow()}</span></div></a>
        <a href="#/distributor/onboarding" class="lp-audience lp-audience-dealer" data-lp-reveal><div class="lp-audience-top"><span>03 / FOR DEALERS</span><span class="lp-circle-arrow">${arrow()}</span></div>${icon('box')}<div class="lp-audience-bottom"><h3>Make room<br>for growth.</h3><p>Connect your offers, enquiries and customer conversations.</p><span>Set up your business ${arrow()}</span></div></a>
        <a href="#/distributor" class="lp-audience lp-audience-distributor" data-lp-reveal><div class="lp-audience-top"><span>04 / FOR DISTRIBUTORS</span><span class="lp-circle-arrow">${arrow()}</span></div>${icon('users')}<div class="lp-audience-bottom"><h3>See the whole<br>business.</h3><p>Keep your team, stock and operations moving together.</p><span>Find your workspace ${arrow()}</span></div></a></div>
      </section>
      <section class="lp-section lp-wrap lp-journey" id="lp-journey" aria-labelledby="lp-journey-title"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">A LITTLE CLARITY. AT EVERY STEP.</p><h2 id="lp-journey-title">Big possibilities.<br><em>Simple next steps.</em></h2></div><p>You bring the questions. MY SOLAR helps you find the next conversation.</p></div><ol class="lp-steps">${[['Discover', 'Explore solar products and learn what to ask.', 'sun'], ['Find your people', 'Browse distributors and their declared service areas.', 'pin'], ['Ask & compare', 'Send enquiries and compare the quotations you receive.', 'compare'], ['Move forward', 'Choose your vendor and follow recorded order and installation updates.', 'check']].map(([title, text, symbol], i) => `<li data-lp-reveal><span class="lp-step-number">0${i + 1}</span><div class="lp-step-icon">${icon(symbol)}</div><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>${cta('/vendors', 'Find a distributor', 'lp-button-outline')}</section>
      <section class="lp-platform lp-section" id="lp-platform" aria-labelledby="lp-platform-title"><div class="lp-wrap"><div class="lp-platform-layout"><div class="lp-platform-copy" data-lp-reveal><p class="lp-kicker">THE BUSINESS BEHIND THE BRIGHTER FUTURE</p><h2 id="lp-platform-title">Less scattered.<br><em>More connected.</em></h2><p>Your customers, your team, your next move. Bring the everyday work of a solar business into one shared operating system.</p><ul><li>${icon('users')} Leads, enquiries & quotations</li><li>${icon('box')} Inventory & purchasing</li><li>${icon('tool')} Projects, field work & service</li><li>${icon('wallet')} Invoices & recorded collections</li></ul>${cta('/distributor', 'Explore the business platform', 'lp-button-gold')}<small>Access depends on your role, company setup and enabled features.</small></div><div class="lp-browser" data-lp-reveal><div class="lp-browser-bar"><span aria-hidden="true">● ● ●</span><span>MY SOLAR / BUSINESS WORKSPACE</span><b>PREVIEW</b></div><div class="lp-preview-body"><div class="lp-preview-brand"><div class="brand">${brand()}</div><span>Business, with perspective.</span></div><div class="lp-preview-tabs" role="tablist" aria-label="Business workflow preview">${Object.keys(previews).map((key, i) => `<button type="button" id="lp-preview-${key}" role="tab" aria-controls="lp-preview-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-lp-preview="${key}">${key[0].toUpperCase() + key.slice(1)}</button>`).join('')}</div><div id="lp-preview-panel" role="tabpanel" aria-labelledby="lp-preview-enquiries" tabindex="0">${previewContent('enquiries')}</div></div></div></div><div class="lp-platform-end"><span>YOUR COMPANY. YOUR IDENTITY.</span><p>A shared platform. A storefront that feels like your business.</p>${link('/distributor/onboarding', 'Start with your company ' + arrow(), 'lp-text-link')}</div></div></section>
      <section class="lp-sia lp-section lp-wrap" aria-labelledby="lp-sia-title"><div class="lp-sia-orbit" data-lp-reveal><div class="lp-orbit-ring"></div><div class="lp-orbit-ring lp-orbit-ring-two"></div><span class="lp-orbit-label lp-orbit-label-one">A clearer question</span><div class="lp-sia-core">${avatar('large')}<strong>SIA</strong><span>by AIRA Labs</span></div><span class="lp-orbit-label lp-orbit-label-two">A better next step</span><small>Replaceable avatar placeholder</small></div><div class="lp-sia-copy" data-lp-reveal><p class="lp-kicker">A LITTLE MORE PERSPECTIVE</p><h2 id="lp-sia-title">Meet SIA.<br><em>Clarity, in your corner.</em></h2><p>Ask better solar questions. Understand the quotation details you have. Bring relevant business activity into focus.</p><div class="lp-sia-options"><div>${icon('sun')}<span><strong>For your solar journey</strong><small>Product guidance, quotation questions and your recorded updates.</small></span></div><div>${icon('spark')}<span><strong>For your business</strong><small>Role-aware summaries and proposals that need your approval.</small></span></div></div><p class="lp-sia-disclosure">AI provider is not currently enabled. SIA can offer rule-based assistance from available, authorized application data. It cannot fill in missing facts.</p><div class="lp-inline-actions">${cta('/customer/sia', 'Meet your purchase assistant', 'lp-button-outline')}${link('/sia', 'Open Virtual CEO ' + arrow(), 'lp-text-link')}</div></div></section>
      <section class="lp-values lp-section"><div class="lp-wrap"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">CONFIDENCE COMES FROM CLARITY</p><h2>Built for real decisions.<br><em>And everyday people.</em></h2></div><p>No shortcuts to trust. Just clearer information, connected work and people in control.</p></div><div class="lp-value-grid">${[['file', 'Know what’s included.', 'Compare supplied specifications and quotation terms. Ask for the information that’s missing.'], ['users', 'Keep your people connected.', 'A shared workspace for the owner, the sales team and the people doing the work.'], ['check', 'Stay in control.', 'Permission-aware access and explicit human approval for supported SIA actions.']].map(([symbol, title, text]) => `<article data-lp-reveal>${icon(symbol)}<h3>${title}</h3><p>${text}</p></article>`).join('')}</div></div></section>
      <section class="lp-finale"><div class="lp-finale-lines" aria-hidden="true"></div><div class="lp-wrap" data-lp-reveal><p class="lp-kicker">YOUR NEXT CHAPTER STARTS HERE</p><h2>Let’s make room<br>for <em>what’s possible.</em></h2><p>A solar decision. A growing business. A brighter everyday.</p><div class="lp-inline-actions">${cta('/products', 'Explore solar solutions', 'lp-button-gold')}${cta('/distributor', 'Grow with MY SOLAR', 'lp-button-glass')}</div></div></section>
    </div>`;
  }

  function cleanup() {
    if (flyingPiece?.parentElement === document.body) flyingPiece.remove();
    flyingPiece = null;
    controller?.abort();
    observer?.disconnect();
    cancelAnimationFrame(frame);
    controller = null;
    observer = null;
    frame = 0;
  }

  function mount() {
    cleanup();
    const page = document.querySelector('.lp-page');
    if (!page) return;
    controller = new AbortController();
    const { signal } = controller;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const scrollToSection = id => {
      const section = document.getElementById('lp-' + id);
      if (!section) return;
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
    };
    const select = (button, selector, panelId, content) => {
      document.querySelectorAll(selector).forEach(tab => {
        const active = tab === button;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      const panel = document.getElementById(panelId);
      panel.innerHTML = content;
      panel.setAttribute('aria-labelledby', button.id);
      watchText(panel);
      schedulePiece();
    };
    document.addEventListener('click', event => {
      const anchor = event.target.closest('[data-lp-scroll]');
      if (anchor) {
        event.preventDefault();
        document.querySelector('.lp-menu')?.removeAttribute('open');
        scrollToSection(anchor.dataset.lpScroll);
      }
      const category = event.target.closest('[data-lp-category]');
      if (category) select(category, '[data-lp-category]', 'lp-category-panel', categoryContent(categories.find(c => c.key === category.dataset.lpCategory)));
      const preview = event.target.closest('[data-lp-preview]');
      if (preview) select(preview, '[data-lp-preview]', 'lp-preview-panel', previewContent(preview.dataset.lpPreview));
    }, { signal });
    document.addEventListener('keydown', event => {
      const menu = document.querySelector('.lp-menu[open]');
      if (event.key === 'Escape' && menu) { menu.open = false; menu.querySelector('summary').focus(); }
      const tab = event.target.closest('.lp-page [role="tab"]');
      if (!tab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    }, { signal });
    const textSelector = 'h1,h2,h3,h4,p,small,.lp-kicker,.lp-button,.lp-step-number,.lp-audience-top>span:first-child,.lp-audience-bottom>span,.lp-platform-copy>ul>li,.lp-footer a,.lp-footer span,.lp-category-tabs button,.lp-preview-tabs button,.lp-intro-strip span,.lp-intro-strip p,.lp-preview-row>span,.lp-preview-row>strong';
    const watchText = root => {
      if (!root || !observer) return;
      const nodes = [...root.querySelectorAll(textSelector)];
      nodes.forEach(el => {
        if (el.dataset.lpText === '1' || !el.textContent.trim() || el.closest('[aria-hidden="true"]')) return;
        if (nodes.some(other => other !== el && other.contains(el))) return;
        el.dataset.lpText = '1';
        observer.observe(el);
      });
    };
    if (!motion.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.dataset.lpSeen === 'true') return;
        entry.target.dataset.lpSeen = 'true';
        observer.unobserve(entry.target);
        if (typeof entry.target.animate !== 'function') return;
        const siblings = [...entry.target.parentElement.children].filter(child => child.dataset.lpText === '1');
        const delay = Math.min(Math.max(siblings.indexOf(entry.target), 0), 4) * 70;
        entry.target.animate(
          [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
          { duration: 680, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
        );
      }), { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
      watchText(page);
      watchText(document.querySelector('.lp-footer'));
    }
    const piece = page.querySelector('.lp-panel-piece');
    const island = page.querySelector('.lp-hero-island');
    const veil = page.querySelector('.lp-cloud-veil');
    const clouds = [...page.querySelectorAll('.lp-cloud')];
    const pin = page.querySelector('.lp-hero-pin');
    const schedulePiece = () => { if (!frame) frame = requestAnimationFrame(placePiece); };
    const cloudDistance = hero => Math.min(Math.max(1, hero.offsetHeight - pin.offsetHeight), window.innerHeight);
    const placeClouds = hero => {
      if (!veil || !pin || !hero || matchMedia('(max-width: 720px)').matches) return 1;
      const top = hero.getBoundingClientRect().top + window.scrollY;
      const passed = Math.max(0, window.scrollY - top);
      const open = motion.matches ? 1 : Math.min(1, passed / cloudDistance(hero));
      const viewWidth = pin.clientWidth;
      let covering = false;
      clouds.forEach(cloud => {
        const dir = Number(cloud.dataset.dir) < 0 ? -1 : 1;
        const flip = Number(cloud.dataset.flip) || 1;
        const left = cloud.offsetLeft;
        const width = cloud.offsetWidth;
        const margin = 48;
        const exit = dir < 0 ? Math.max(0, left + width + margin) : Math.max(0, viewWidth - left + margin);
        const shift = dir * exit * open;
        cloud.style.transform = `translate3d(${shift}px, 0, 0) scaleX(${flip})`;
        const visualLeft = left + shift;
        if (visualLeft < viewWidth && visualLeft + width > 0) covering = true;
      });
      veil.style.setProperty('--lp-cloud-open', open.toFixed(4));
      const gone = motion.matches || (open >= 1 && !covering);
      veil.style.visibility = gone ? 'hidden' : 'visible';
      return gone ? 1 : Math.min(open, 0.999);
    };
    const placePiece = () => {
      frame = 0;
      const hero = page.querySelector('.lp-hero');
      const cloudOpen = placeClouds(hero);
      const cloudsGone = cloudOpen >= 1;
      if (!piece || !island) return;
      const ir = island.getBoundingClientRect();
      const startWidth = ir.width * 0.47852;
      const start = {
        x: ir.left + ir.width * 0.30625,
        y: ir.top + ir.height * 0.2563,
        w: startWidth,
        h: startWidth * (336 / 700),
        r: 0
      };
      const panels = document.querySelector('[data-lp-category="panels"]')?.getAttribute('aria-selected') === 'true';
      const slot = panels ? page.querySelector('.lp-panel-slot') : null;
      const art = slot?.closest('.lp-category-art');
      let end = null;
      let progress = 0;
      if (!motion.matches && slot && hero) {
        const sr = slot.getBoundingClientRect();
        const endWidth = sr.width * 0.82;
        const endHeight = endWidth * (336 / 700);
        end = {
          x: sr.left + (sr.width - endWidth) / 2,
          y: sr.top + (sr.height - endHeight) / 2,
          w: endWidth,
          h: endHeight,
          r: 0
        };
        const heroTop = hero.getBoundingClientRect().top + window.scrollY;
        const startScroll = heroTop + cloudDistance(hero);
        const slotTop = sr.top + window.scrollY;
        const arriveAt = slotTop - (window.innerHeight - sr.height) / 2;
        const span = Math.max(1, arriveAt - startScroll);
        const traveled = Math.max(0, window.scrollY - startScroll);
        progress = cloudsGone ? Math.min(1, traveled / span) : 0;
      }
      let box = start;
      if (end) {
        const h = start.h + (end.h - start.h) * progress;
        let y = start.y + (end.y - start.y) * progress;
        const floor = window.innerHeight - h - 28;
        if (progress < 1) y = Math.min(y, floor);
        if (end.y <= y) y = end.y;
        box = {
          x: start.x + (end.x - start.x) * progress,
          y,
          w: start.w + (end.w - start.w) * progress,
          h,
          r: 0
        };
      }
      piece.style.width = `${box.w}px`;
      piece.style.height = `${box.h}px`;
      piece.style.transform = `rotate(${box.r}deg)`;
      const flying = cloudsGone && progress > 0;
      if (flying) {
        if (piece.parentElement !== document.body) document.body.appendChild(piece);
        flyingPiece = piece;
        piece.style.position = 'fixed';
        piece.style.zIndex = '40';
        piece.style.left = `${box.x}px`;
        piece.style.top = `${box.y}px`;
      } else {
        if (pin && piece.parentElement !== pin) pin.appendChild(piece);
        flyingPiece = null;
        const pinRect = pin.getBoundingClientRect();
        piece.style.position = 'absolute';
        piece.style.zIndex = '5';
        piece.style.left = `${box.x - pinRect.left}px`;
        piece.style.top = `${box.y - pinRect.top}px`;
      }
      const islandOff = ir.bottom < 80 || ir.top > window.innerHeight;
      piece.style.visibility = !flying && islandOff ? 'hidden' : 'visible';
      art?.classList.toggle('is-replaced', progress > 0.92);
    };
    window.addEventListener('scroll', schedulePiece, { signal, passive: true });
    window.addEventListener('resize', schedulePiece, { signal });
    schedulePiece();
    const panel = page.querySelector('.lp-hero-panel');
    const stopMotion = () => { if (motion.matches) { observer?.disconnect(); (page.getAnimations?.({ subtree: true }) || []).forEach(animation => animation.cancel()); if (panel) panel.style.transform = ''; } };
    motion.addEventListener('change', stopMotion, { signal });
    const section = new URLSearchParams(location.hash.split('?')[1] || '').get('section');
    if (section && /^[a-z]+$/.test(section)) requestAnimationFrame(() => scrollToSection(section));
  }
  return { page, header, footer, mount, cleanup };
})();
