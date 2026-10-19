/* Public marketing experience. Preview content never reads private workspace data. */
const Landing = (() => {
  let controller;
  let observer;
  let frame = 0;
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
    if (key === 'panels') return `<svg class="lp-equipment" viewBox="0 0 460 340" fill="none" aria-hidden="true"><defs><linearGradient id="lp-panel" x2="1" y2="1"><stop stop-color="#304c53"/><stop offset="1" stop-color="#142b37"/></linearGradient><pattern id="lp-cells" width="42" height="54" patternUnits="userSpaceOnUse"><path d="M0 0H42V54H0Z" stroke="#a4bec1" stroke-width=".8"/><path d="M14 0V54M28 0V54" stroke="#a4bec1" stroke-opacity=".24"/></pattern></defs><ellipse cx="237" cy="287" rx="158" ry="18" fill="#14382b" opacity=".08"/><g transform="translate(67 38) rotate(-9 165 125)"><path d="M28 244V272M302 244V272" stroke="#8b9c96" stroke-width="9"/><rect width="330" height="245" rx="4" fill="url(#lp-panel)" stroke="#b0bbb7" stroke-width="8"/><rect x="5" y="5" width="320" height="235" fill="url(#lp-cells)"/><path d="M165 3V242" stroke="#bac9c7" stroke-width="4"/><path d="M5 5H320L5 200Z" fill="white" opacity=".07"/></g></svg>`;
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
      <section class="lp-hero" aria-labelledby="lp-hero-title">
        <picture class="lp-hero-picture"><source type="image/webp" srcset="/assets/landing-solar-960.webp 960w, /assets/landing-solar-1536.webp 1536w" sizes="100vw"><img src="/assets/landing-solar.jpg" width="1536" height="1024" alt="" fetchpriority="high" decoding="async"></picture><div class="lp-hero-shade"></div>
        <div class="lp-wrap lp-hero-content"><p class="lp-kicker lp-hero-enter"><span></span> ONE CONNECTED SOLAR ECOSYSTEM</p><h1 id="lp-hero-title"><span class="lp-hero-enter">Powering every</span><span class="lp-hero-enter">possibility.</span><em class="lp-hero-enter">Together.</em></h1><p class="lp-hero-intro lp-hero-enter">From your first solar question to your next business milestone. Find the products, people and tools to move forward.</p><div class="lp-hero-actions lp-hero-enter">${cta('/products', 'Explore solar solutions', 'lp-button-gold')}${cta('/distributor', 'I’m a solar business', 'lp-button-glass')}</div><div class="lp-hero-bottom"><a href="#/?section=audiences" data-lp-scroll="audiences">A brighter way forward <span>↓</span></a><span>Solar architecture · AI-generated illustration</span></div></div>
        <div class="lp-hero-caption"><span class="lp-caption-mark">${icon('sun')}</span><div>POWER IN EVERY POSSIBILITY<strong>Your energy. Your next chapter.</strong></div></div>
      </section>
      <div class="lp-intro-strip"><div class="lp-wrap"><span>CHOOSE SOLAR. BUILD POSSIBILITIES.</span><p>For homes. For businesses. <strong>For a brighter everyday.</strong></p>${icon('sun')}</div></div>
      <section class="lp-section lp-audiences lp-wrap" id="lp-audiences" aria-labelledby="lp-audiences-title"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">YOUR PLACE IN THE BIGGER PICTURE</p><h2 id="lp-audiences-title">Different journeys.<br><em>One solar ecosystem.</em></h2></div><p>Whether you’re choosing solar or building a business around it, there’s a place for you here.</p></div>
        <div class="lp-audience-grid"><a href="#/customer" class="lp-audience lp-audience-customer" data-lp-reveal><img src="/assets/landing-solar-960.webp" width="960" height="640" loading="lazy" decoding="async" alt=""><div class="lp-audience-overlay"></div><div class="lp-audience-top"><span>01 / FOR CUSTOMERS</span><span class="lp-circle-arrow">${arrow()}</span></div><div class="lp-audience-bottom"><h3>A new outlook<br>starts at home.</h3><p>Explore products, connect with distributors and compare quotations.</p><span>Start your solar journey ${arrow()}</span></div></a>
        <a href="#/distributor" class="lp-audience lp-audience-installer" data-lp-reveal><div class="lp-audience-top"><span>02 / FOR INSTALLERS & EPCs</span><span class="lp-circle-arrow">${arrow()}</span></div><div class="lp-roof-lines" aria-hidden="true"></div><div class="lp-audience-bottom"><h3>Good work.<br>Better connected.</h3><p>Bring projects, field tasks and installation milestones into one workspace.</p><span>Explore the business platform ${arrow()}</span></div></a>
        <a href="#/distributor/onboarding" class="lp-audience lp-audience-dealer" data-lp-reveal><div class="lp-audience-top"><span>03 / FOR DEALERS</span><span class="lp-circle-arrow">${arrow()}</span></div>${icon('box')}<div class="lp-audience-bottom"><h3>Make room<br>for growth.</h3><p>Connect your offers, enquiries and customer conversations.</p><span>Set up your business ${arrow()}</span></div></a>
        <a href="#/distributor" class="lp-audience lp-audience-distributor" data-lp-reveal><div class="lp-audience-top"><span>04 / FOR DISTRIBUTORS</span><span class="lp-circle-arrow">${arrow()}</span></div>${icon('users')}<div class="lp-audience-bottom"><h3>See the whole<br>business.</h3><p>Keep your team, stock and operations moving together.</p><span>Find your workspace ${arrow()}</span></div></a></div>
      </section>
      <section class="lp-discovery lp-section" id="lp-discovery" aria-labelledby="lp-discovery-title"><div class="lp-wrap"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">THE BUILDING BLOCKS OF BETTER ENERGY</p><h2 id="lp-discovery-title">A world of solar.<br><em>A clearer starting point.</em></h2></div>${link('/products', 'Browse the catalogue ' + arrow(), 'lp-text-link')}</div><div class="lp-category-tabs" role="tablist" aria-label="Explore energy categories">${categories.map((c, i) => `<button type="button" id="lp-category-${c.key}" role="tab" aria-selected="${i === 0}" aria-controls="lp-category-panel" tabindex="${i === 0 ? '0' : '-1'}" data-lp-category="${c.key}">${c.name}</button>`).join('')}</div><div id="lp-category-panel" class="lp-category-panel" role="tabpanel" aria-labelledby="lp-category-panels" tabindex="0">${categoryContent(categories[0])}</div></div></section>
      <section class="lp-section lp-wrap lp-journey" id="lp-journey" aria-labelledby="lp-journey-title"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">A LITTLE CLARITY. AT EVERY STEP.</p><h2 id="lp-journey-title">Big possibilities.<br><em>Simple next steps.</em></h2></div><p>You bring the questions. MY SOLAR helps you find the next conversation.</p></div><ol class="lp-steps">${[['Discover', 'Explore solar products and learn what to ask.', 'sun'], ['Find your people', 'Browse distributors and their declared service areas.', 'pin'], ['Ask & compare', 'Send enquiries and compare the quotations you receive.', 'compare'], ['Move forward', 'Choose your vendor and follow recorded order and installation updates.', 'check']].map(([title, text, symbol], i) => `<li data-lp-reveal><span class="lp-step-number">0${i + 1}</span><div class="lp-step-icon">${icon(symbol)}</div><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>${cta('/vendors', 'Find a distributor', 'lp-button-outline')}</section>
      <section class="lp-platform lp-section" id="lp-platform" aria-labelledby="lp-platform-title"><div class="lp-wrap"><div class="lp-platform-layout"><div class="lp-platform-copy" data-lp-reveal><p class="lp-kicker">THE BUSINESS BEHIND THE BRIGHTER FUTURE</p><h2 id="lp-platform-title">Less scattered.<br><em>More connected.</em></h2><p>Your customers, your team, your next move. Bring the everyday work of a solar business into one shared operating system.</p><ul><li>${icon('users')} Leads, enquiries & quotations</li><li>${icon('box')} Inventory & purchasing</li><li>${icon('tool')} Projects, field work & service</li><li>${icon('wallet')} Invoices & recorded collections</li></ul>${cta('/distributor', 'Explore the business platform', 'lp-button-gold')}<small>Access depends on your role, company setup and enabled features.</small></div><div class="lp-browser" data-lp-reveal><div class="lp-browser-bar"><span aria-hidden="true">● ● ●</span><span>MY SOLAR / BUSINESS WORKSPACE</span><b>PREVIEW</b></div><div class="lp-preview-body"><div class="lp-preview-brand"><div class="brand">${brand()}</div><span>Business, with perspective.</span></div><div class="lp-preview-tabs" role="tablist" aria-label="Business workflow preview">${Object.keys(previews).map((key, i) => `<button type="button" id="lp-preview-${key}" role="tab" aria-controls="lp-preview-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-lp-preview="${key}">${key[0].toUpperCase() + key.slice(1)}</button>`).join('')}</div><div id="lp-preview-panel" role="tabpanel" aria-labelledby="lp-preview-enquiries" tabindex="0">${previewContent('enquiries')}</div></div></div></div><div class="lp-platform-end"><span>YOUR COMPANY. YOUR IDENTITY.</span><p>A shared platform. A storefront that feels like your business.</p>${link('/distributor/onboarding', 'Start with your company ' + arrow(), 'lp-text-link')}</div></div></section>
      <section class="lp-sia lp-section lp-wrap" aria-labelledby="lp-sia-title"><div class="lp-sia-orbit" data-lp-reveal><div class="lp-orbit-ring"></div><div class="lp-orbit-ring lp-orbit-ring-two"></div><span class="lp-orbit-label lp-orbit-label-one">A clearer question</span><div class="lp-sia-core">${avatar('large')}<strong>SIA</strong><span>by AIRA Labs</span></div><span class="lp-orbit-label lp-orbit-label-two">A better next step</span><small>Replaceable avatar placeholder</small></div><div class="lp-sia-copy" data-lp-reveal><p class="lp-kicker">A LITTLE MORE PERSPECTIVE</p><h2 id="lp-sia-title">Meet SIA.<br><em>Clarity, in your corner.</em></h2><p>Ask better solar questions. Understand the quotation details you have. Bring relevant business activity into focus.</p><div class="lp-sia-options"><div>${icon('sun')}<span><strong>For your solar journey</strong><small>Product guidance, quotation questions and your recorded updates.</small></span></div><div>${icon('spark')}<span><strong>For your business</strong><small>Role-aware summaries and proposals that need your approval.</small></span></div></div><p class="lp-sia-disclosure">AI provider is not currently enabled. SIA can offer rule-based assistance from available, authorized application data. It cannot fill in missing facts.</p><div class="lp-inline-actions">${cta('/customer/sia', 'Meet your purchase assistant', 'lp-button-outline')}${link('/sia', 'Open Virtual CEO ' + arrow(), 'lp-text-link')}</div></div></section>
      <section class="lp-values lp-section"><div class="lp-wrap"><div class="lp-section-heading" data-lp-reveal><div><p class="lp-kicker">CONFIDENCE COMES FROM CLARITY</p><h2>Built for real decisions.<br><em>And everyday people.</em></h2></div><p>No shortcuts to trust. Just clearer information, connected work and people in control.</p></div><div class="lp-value-grid">${[['file', 'Know what’s included.', 'Compare supplied specifications and quotation terms. Ask for the information that’s missing.'], ['users', 'Keep your people connected.', 'A shared workspace for the owner, the sales team and the people doing the work.'], ['check', 'Stay in control.', 'Permission-aware access and explicit human approval for supported SIA actions.']].map(([symbol, title, text]) => `<article data-lp-reveal>${icon(symbol)}<h3>${title}</h3><p>${text}</p></article>`).join('')}</div></div></section>
      <section class="lp-finale"><div class="lp-finale-lines" aria-hidden="true"></div><div class="lp-wrap" data-lp-reveal><p class="lp-kicker">YOUR NEXT CHAPTER STARTS HERE</p><h2>Let’s make room<br>for <em>what’s possible.</em></h2><p>A solar decision. A growing business. A brighter everyday.</p><div class="lp-inline-actions">${cta('/products', 'Explore solar solutions', 'lp-button-gold')}${cta('/distributor', 'Grow with MY SOLAR', 'lp-button-glass')}</div></div></section>
    </div>`;
  }

  function cleanup() {
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
    const targets = [...page.querySelectorAll('[data-lp-reveal]')];
    if (!motion.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.lpSeen = 'true';
        if (typeof entry.target.animate !== 'function') { observer.unobserve(entry.target); return; }
        const scale = entry.target.classList.contains('lp-browser') || entry.target.classList.contains('lp-sia-orbit');
        const delay = Math.min([...entry.target.parentElement.children].indexOf(entry.target), 3) * 65;
        entry.target.animate([{ opacity: .4, transform: scale ? 'translateY(16px) scale(.98)' : 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, delay, easing: 'cubic-bezier(.2,.7,.2,1)' });
        observer.unobserve(entry.target);
      }), { threshold: .1 });
      targets.forEach(target => observer.observe(target));
    }
    const photo = page.querySelector('.lp-hero-picture');
    const stopMotion = () => { if (motion.matches) { observer?.disconnect(); (page.getAnimations?.({ subtree: true }) || []).forEach(animation => animation.cancel()); photo.style.transform = ''; } };
    motion.addEventListener('change', stopMotion, { signal });
    const onScroll = () => {
      if (frame || motion.matches || innerWidth < 1000 || scrollY > 950) return;
      frame = requestAnimationFrame(() => { photo.style.transform = `translateY(${Math.min(scrollY * .08, 50)}px) scale(1.04)`; frame = 0; });
    };
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    const section = new URLSearchParams(location.hash.split('?')[1] || '').get('section');
    if (section && /^[a-z]+$/.test(section)) requestAnimationFrame(() => scrollToSection(section));
  }
  return { page, header, footer, mount, cleanup };
})();
