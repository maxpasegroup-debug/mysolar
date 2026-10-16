/* Public navigation only. Authentication and record authorization remain in existing services. */
const PublicHeader = (() => {
  let controller;
  let mobile = false;
  let opener;
  let scrollFrame = 0;
  const restoredInert = new Map();
  const compact = () => matchMedia('(max-width: 999px)').matches;
  const definitions = [
    { id: 'explore', title: 'Explore Solar', caption: 'YOUR SOLAR JOURNEY', items: [
      ['/products', 'Solar Solutions', 'Explore published solar products and equipment.', 'sun'],
      ['/vendors', 'Find Solar Providers', 'Browse distributors and their declared service areas.', 'pin'],
      ['/customer/enquiry/new', 'Request a Quote', 'Share your requirements with selected distributors.', 'file'],
      ['/customer/compare', 'Compare Quotations', 'Review quotations for the same enquiry after sign-in.', 'compare']
    ] },
    { id: 'business', title: 'For Businesses', caption: 'BUSINESS OPPORTUNITIES', items: [
      ['/?section=platform', 'Business Platform', 'Explore the shared tools for running a solar business.', 'grid'],
      ['/distributor', 'Distributors', 'Discover the distributor workspace and opportunities.', 'box'],
      ['/distributor/login', 'Business Log In', 'Sign in and choose an authorized company workspace.', 'users'],
      ['/distributor/onboarding', 'Become a Partner', 'Start distributor company onboarding.', 'arrow', 'emphasis']
    ] },
    { id: 'learn', title: 'Learn', caption: 'A CLEARER NEXT STEP', items: [
      ['/?section=journey', 'How MY SOLAR Works', 'Follow the discovery, enquiry and installation journey.', 'sun'],
      ['/app-info', 'App & Offline Guide', 'Learn about web-app installation and offline limits.', 'help']
    ] }
  ];
  const logo = () => `<span class="ms-logo"><img src="/assets/my-solar-solutions-logo.png" width="2091" height="752" alt="MY Solar Solutions — A brighter everyday" decoding="async"><span class="ms-logo-gloss" aria-hidden="true"></span></span>`;
  const startButton = (className = '') => `<button type="button" class="ph-start ${className}" data-ph-start aria-haspopup="dialog">Get Started ${icon('arrow')}</button>`;
  function login() {
    const permissions = Account.session.platformPermissions || [];
    const destination = permissions.includes('platform.companies.read') ? '/platform' : Account.session.companies?.length ? '/companies' : '/customer/dashboard';
    return link(Account.user ? destination : Journey.authPath('/customer/login'), Account.user ? 'My Workspace' : 'Log In', 'ph-login');
  }
  function operatorLinks() {
    if (Account.isDemo()) return '';
    const permissions = Account.session.platformPermissions || [];
    return [['platform.companies.read', '/platform', 'Platform administration'], ['catalogue.read', '/platform/catalogue', 'Catalogue administration']]
      .filter(([permission]) => permissions.includes(permission))
      .map(([, path, label]) => link(path, label, 'ph-operator-link')).join('');
  }
  function group({ id, title, caption, items }) {
    return `<div class="ph-group"><button type="button" class="ph-trigger" id="ph-trigger-${id}" aria-expanded="false" aria-controls="ph-panel-${id}" data-ph-group="${id}">${title}<svg class="ph-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button><div class="ph-panel" id="ph-panel-${id}" aria-labelledby="ph-trigger-${id}" hidden><p class="ph-caption">${caption}</p>${items.map(([path, label, description, symbol, emphasis]) => link(path, `<span class="ph-item-icon">${icon(symbol)}</span><span><strong>${label}</strong><small>${description}</small></span>`, `ph-item ${emphasis ? 'ph-item-emphasis' : ''}`)).join('')}${id === 'business' ? operatorLinks() : ''}${id === 'learn' ? `<div class="ph-language"><span>Interface language</span>${languageSelect()}<small>Some content remains in English.</small></div>` : ''}</div></div>`;
  }
  function journey() {
    const customer = Account.user ? '/customer/dashboard' : Journey.authPath('/register?journey=customer');
    const distributor = Account.user ? '/distributor/onboarding' : '/register?journey=distributor';
    return `<dialog class="ph-journey" id="ph-journey" aria-labelledby="ph-journey-title" aria-describedby="ph-journey-intro"><div class="ph-journey-top"><p class="ph-caption">YOUR NEXT CHAPTER</p><button type="button" class="ph-close" data-ph-dismiss aria-label="Close journey selector">${icon('close')}</button></div><h2 id="ph-journey-title">Where would you<br>like to begin?</h2><p id="ph-journey-intro">Choose your next step. You can explore the marketplace before creating an account.</p><div class="ph-choices">${link(customer, `<span class="ph-choice-icon">${icon('sun')}</span><span><strong>I want solar for my home or business</strong><small>${Account.user ? 'Open your customer workspace.' : 'Create a personal customer account.'}</small></span>${icon('arrow')}`, 'ph-choice')}${link(distributor, `<span class="ph-choice-icon">${icon('box')}</span><span><strong>I’m a solar distributor</strong><small>${Account.user ? 'Set up your distributor company.' : 'Create an account, then set up your company.'}</small><b>Distributor onboarding</b></span>${icon('arrow')}`, 'ph-choice ph-choice-business')}</div><div class="ph-journey-bottom">${link('/products', 'Explore solar first', 'ph-secondary-link')}<button type="button" data-ph-dismiss class="ph-cancel">Cancel</button></div><p class="ph-journey-note">Installer or dealer? ${link('/distributor', 'Explore the shared business overview.')} Separate onboarding journeys are not yet available.</p></dialog>`;
  }
  function markup() {
    return `<header class="public-header ph-header"><div class="ph-inner">${link('/', logo(), 'brand ph-brand')}<div id="ph-navigation" class="ph-navigation"><div class="ph-mobile-top"><span id="ph-mobile-title">Explore MY Solar Solutions</span><button type="button" class="ph-close" data-ph-mobile-close aria-label="Close navigation">${icon('close')}</button></div><nav class="ph-nav" aria-label="Public navigation">${definitions.map(group).join('')}</nav><div class="ph-actions">${login()}${startButton()}</div></div>${startButton('ph-compact-start')}<button type="button" class="ph-menu-toggle" aria-label="Open navigation" aria-controls="ph-navigation" aria-expanded="false" data-ph-mobile>${icon('menu')}<span>Menu</span></button></div><button type="button" class="ph-scrim" data-ph-mobile-close aria-label="Close navigation" tabindex="-1" hidden></button></header>${journey()}`;
  }

  function panels() { return [...document.querySelectorAll('.ph-panel')]; }
  function closeGroups() {
    panels().forEach(panel => { panel.hidden = true; });
    document.querySelectorAll('[data-ph-group]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  function toggleGroup(button, force) {
    const expanded = force ?? button.getAttribute('aria-expanded') !== 'true';
    closeGroups();
    button.setAttribute('aria-expanded', String(expanded));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !expanded;
  }
  function restoreBackground() {
    restoredInert.forEach((value, element) => { element.inert = value; });
    restoredInert.clear();
    document.body.classList.remove('ph-scroll-lock');
  }
  function setMobile(open, focus = true) {
    const header = document.querySelector('.ph-header');
    if (!header) return;
    const panel = document.getElementById('ph-navigation');
    mobile = open;
    header.classList.toggle('ph-mobile-open', open);
    header.querySelector('[data-ph-mobile]').setAttribute('aria-expanded', String(open));
    header.querySelector('.ph-scrim').hidden = !open;
    closeGroups();
    if (open) {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'ph-mobile-title');
      document.querySelectorAll('main, footer, .skip-link, .ph-brand, .ph-compact-start, .ph-menu-toggle').forEach(element => {
        restoredInert.set(element, element.inert);
        element.inert = true;
      });
      document.body.classList.add('ph-scroll-lock');
      if (focus) panel.querySelector('[data-ph-mobile-close]').focus();
    } else {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-labelledby');
      restoreBackground();
      if (focus) header.querySelector('[data-ph-mobile]').focus();
    }
  }
  function closeJourney() {
    const dialog = document.getElementById('ph-journey');
    if (dialog?.open) dialog.close();
    document.body.classList.remove('ph-journey-lock');
  }
  function cleanup() {
    controller?.abort();
    controller = null;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    closeJourney();
    restoreBackground();
    mobile = false;
  }
  function mount() {
    cleanup();
    const header = document.querySelector('.ph-header');
    if (!header) return;
    controller = new AbortController();
    const { signal } = controller;
    const dialog = document.getElementById('ph-journey');
    const focusable = root => [...root.querySelectorAll('a[href],button,select')].filter(node => !node.disabled && node.getClientRects().length && !node.closest('[hidden]'));
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-ph-group]');
      if (trigger) { toggleGroup(trigger); return; }
      if (event.target.closest('[data-ph-mobile]')) { setMobile(!mobile); return; }
      if (event.target.closest('[data-ph-mobile-close]')) { setMobile(false); return; }
      if (event.target.closest('[data-ph-start]')) {
        opener = event.target.closest('[data-ph-start]');
        if (mobile) setMobile(false, false);
        closeGroups();
        document.body.classList.add('ph-journey-lock');
        dialog.showModal();
        return;
      }
      if (event.target.closest('[data-ph-dismiss]')) { closeJourney(); return; }
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeJourney();
      }
      if (event.target.closest('.ph-header a,.ph-journey a')) {
        closeGroups();
        if (mobile) setMobile(false, false);
        closeJourney();
      } else if (!event.target.closest('.ph-group')) closeGroups();
    }, { signal });
    document.addEventListener('keydown', event => {
      if (dialog.open) {
        if (event.key === 'Escape') { event.preventDefault(); closeJourney(); }
        return; // Native modal supplies focus containment.
      }
      if (event.target.matches('select,input,textarea') && !['Escape', 'Tab'].includes(event.key)) return;
      const trigger = event.target.closest('[data-ph-group]');
      const panel = event.target.closest('.ph-panel');
      if (event.key === 'Escape') {
        const expanded = header.querySelector('[data-ph-group][aria-expanded="true"]');
        if (expanded) { event.preventDefault(); closeGroups(); expanded.focus(); }
        else if (mobile) { event.preventDefault(); setMobile(false); }
        return;
      }
      if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        toggleGroup(trigger, true);
        const links = focusable(document.getElementById(trigger.getAttribute('aria-controls')));
        (event.key === 'ArrowUp' ? links.at(-1) : links[0])?.focus();
      } else if (panel && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const links = focusable(panel), index = links.indexOf(event.target);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links[next]?.focus();
      } else if (trigger && !mobile && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const triggers = [...header.querySelectorAll('[data-ph-group]')], index = triggers.indexOf(trigger);
        closeGroups();
        triggers[(index + (event.key === 'ArrowRight' ? 1 : -1) + triggers.length) % triggers.length].focus();
      }
      if (event.key === 'Tab' && mobile) {
        const links = focusable(document.getElementById('ph-navigation'));
        if (event.shiftKey && event.target === links[0]) { event.preventDefault(); links.at(-1)?.focus(); }
        else if (!event.shiftKey && event.target === links.at(-1)) { event.preventDefault(); links[0]?.focus(); }
      }
    }, { signal });
    document.addEventListener('focusin', event => { if (!header.contains(event.target)) closeGroups(); }, { signal });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('ph-journey-lock');
      if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
      else header.querySelector('[data-ph-mobile]')?.focus({ preventScroll: true });
    }, { signal });
    window.addEventListener('resize', () => { if (!compact() && mobile) setMobile(false, false); }, { signal });
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { header.classList.toggle('ph-scrolled', scrollY > 16); scrollFrame = 0; });
    };
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    header.classList.toggle('ph-scrolled', scrollY > 16);
  }
  return { markup, logo, mount, cleanup };
})();
