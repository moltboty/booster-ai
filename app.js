(() => {
  const translations = {
    ar: {
      'a11y.skip': 'انتقل إلى المحتوى',
      'a11y.home': 'الصفحة الرئيسية لموقع Booster AI',
      'a11y.openNav': 'افتح قائمة التنقل',
      'a11y.closeNav': 'أغلق قائمة التنقل',
      'a11y.mainNav': 'التنقل الرئيسي',
      'nav.approach': 'منهجيتنا',

      'nav.start': 'ابدأ محادثة',
      'nav.contact': 'تواصل معنا',
      'ecosystem.caption': 'منظومة الذكاء الاصطناعي والأتمتة',
      'home.heroTitle': 'نشخص طريقة العمل.<br>نبني ما يصنع الفرق.<br><em>نعزز أداء المؤسسة بالذكاء الاصطناعي والتقنية.</em>',
      'home.heroLede': 'نفهم آلية عمل مؤسستك، ونحدد أين يمكن للذكاء الاصطناعي أن يحقق قيمة حقيقية، ثم نبني الحل المناسب حول سير العمل الفعلي.',
      'home.explore': 'استكشف منهجيتنا',
      'home.heroVisualLabel': 'تتحول الإشارات التشغيلية إلى خارطة طريق واضحة، وتنفيذ مترابط، ومراجعة بشرية، وتحسين قابل للقياس',
      'home.scroll': 'مرر',
      'home.beliefLabel': 'ما نؤمن به',
      'home.beliefTitle': 'الذكاء الاصطناعي مجرد أداة.<br><em>والفرق الحقيقي في كيف تستخدمه بذكاء، ولصالح مؤسستك.</em>',
      'home.approachLabel': 'منهجية Booster',
      'home.approachTitle': 'ثلاث مراحل.<br>لشراكة واحدة مستمرة.',
      'stage.diagnose': 'نشخص',
      'stage.diagnoseBody': 'نكشف كيف تعمل مؤسستك فعليا، ونوضح مسارات العمل غير الواضحة، ونحدد أين يمكن للذكاء الاصطناعي أو الأتمتة أن يصنعا قيمة حقيقية.',
      'stage.diagnoseOutput': 'أولويات واضحة، وفرص محددة، وخارطة طريق عملية.',
      'stage.build': 'نبني',
      'stage.buildBody': 'نصمم ونطور وننفذ حلول الذكاء الاصطناعي والأتمتة المناسبة حول عملياتك الفعلية، مع الضوابط الملائمة والحكم البشري في مكانه الصحيح.',
      'stage.buildOutput': 'حل عملي ينجح في العالم الحقيقي.',
      'stage.boost': 'نعزز',
      'stage.boostBody': 'نحسن سير العمل باستمرار لتوفير الوقت، وخفض التكلفة، ورفع الكفاءة، وصناعة قيمة أكبر للأعمال.',
      'visual.signalsClarity': 'الإشارات تصبح وضوحا',
      'visual.connectedDelivery': 'تنفيذ مترابط',
      'visual.measuredImprovement': 'تحسين قابل للقياس',

      'home.ctaLabel': 'ابدأ بسير عمل حقيقي واحد',
      'home.ctaTitle': 'لنكتشف أين يمكن لمؤسستك أن تعمل بصورة أفضل.',
      'contact.title': 'خذ أول خطوة نحو استخدام الذكاء الاصطناعي بذكاء.',
      'contact.intro': 'اترك بياناتك، وفريقنا يتواصل معك لبدء المحادثة.',
      'contact.noJsBody': 'يرجى تفعيل JavaScript لاستخدام النموذج.',
      'contact.fullName': 'الاسم الأول والأخير',
      'contact.email': 'البريد الإلكتروني للعمل',
      'contact.organization': 'اسم المؤسسة',
      'contact.phone': 'رقم الجوال',
      'contact.prepare': 'ابدأ الآن',
      'contact.localOnly': 'النموذج غير متصل بوسيلة إرسال بعد.',
      'contact.successTitle': 'شكرا لتواصلك معنا.',
      'contact.successBody': 'سوف يتم التواصل معك في أقرب وقت.',
      'footer.tagline': 'نشخص. نبني. نعزز.'
    },
    en: {
      'a11y.skip': 'Skip to content',
      'a11y.home': 'Booster AI home',
      'a11y.openNav': 'Open navigation',
      'a11y.closeNav': 'Close navigation',
      'a11y.mainNav': 'Main navigation',
      'nav.approach': 'Approach',

      'nav.start': 'Start a conversation',
      'nav.contact': 'Contact',
      'ecosystem.caption': 'AI and automation ecosystem',
      'home.heroTitle': 'Diagnose the work.<br>Build what matters.<br><em>Boost the organization with AI and Technology.</em>',
      'home.heroLede': 'We understand how your organization operates, identify where AI can create value, then build the right solution around the real workflow.',
      'home.explore': 'Explore the approach',
      'home.heroVisualLabel': 'Organizational signals converge into a clear roadmap, connected implementation system, human checkpoint and improving workflow',
      'home.scroll': 'Scroll',
      'home.beliefLabel': 'What we believe',
      'home.beliefTitle': 'AI is simply a tool.<br><em>What matters is how you use it wisely, for the benefit of your organization.</em>',
      'home.approachLabel': 'The Booster approach',
      'home.approachTitle': 'Three stages.<br>One continuous partnership.',
      'stage.diagnose': 'Diagnose',
      'stage.diagnoseBody': 'We uncover how your organization really works, bring clarity to unclear workflows, and identify where AI or automation can create meaningful value.',
      'stage.diagnoseOutput': 'Clear priorities, mapped opportunities, and a practical roadmap.',
      'stage.build': 'Build',
      'stage.buildBody': 'We design, develop, and implement the right AI and automation solutions built around your real operations, with the right controls and human judgement in place.',
      'stage.buildOutput': 'A practical solution that works in the real world.',
      'stage.boost': 'Boost',
      'stage.boostBody': 'We continuously refine the workflow to save time, reduce cost, improve efficiency, and create greater business value.',
      'visual.signalsClarity': 'Signals become clarity',
      'visual.connectedDelivery': 'Connected delivery',
      'visual.measuredImprovement': 'Measured improvement',

      'home.ctaLabel': 'Start with one real workflow',
      'home.ctaTitle': 'Let’s find where your organization can move better.',
      'contact.title': 'Take the first step toward using AI more intelligently.',
      'contact.intro': 'Leave your details and our team will contact you to start the conversation.',
      'contact.noJsBody': 'Please enable JavaScript to use the form.',
      'contact.fullName': 'First and last name',
      'contact.email': 'Work email',
      'contact.phone': 'Mobile number',
      'contact.organization': 'Organization name',
      'contact.prepare': 'Get started',
      'contact.localOnly': 'This form is not connected to a delivery service yet.',
      'contact.successTitle': 'Thank you for contacting us.',
      'contact.successBody': 'We will contact you as soon as possible.',
      'footer.tagline': 'Diagnose. Build. Boost.'
    }
  };

  const page = document.body.classList.contains('contact-page') ? 'contact' : 'home';
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const form = document.querySelector('[data-contact-form]');
  const formStatus = document.querySelector('[data-contact-status]');
  let currentLanguage = 'ar';

  const text = (key) => translations[currentLanguage][key] || key;

  const setMenu = (open) => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    const label = menuButton.querySelector('.sr-only');
    if (label) label.textContent = text(open ? 'a11y.closeNav' : 'a11y.openNav');
  };


  const applyLanguage = (language, persist = true) => {
    currentLanguage = language === 'en' ? 'en' : 'ar';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = text(node.dataset.i18n);
      if (node.hasAttribute('data-i18n-html')) node.innerHTML = value;
      else node.textContent = value;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach((node) => {
      const definition = node.dataset.i18nAttr || '';
      const separator = definition.indexOf(':');
      if (separator < 1) return;
      const attribute = definition.slice(0, separator);
      const key = definition.slice(separator + 1);
      node.setAttribute(attribute, text(key));
    });

    document.querySelectorAll('[data-language-toggle]').forEach((button) => {
      const nextLanguage = currentLanguage === 'ar' ? 'English' : 'العربية';
      button.textContent = nextLanguage;
      button.setAttribute('aria-label', currentLanguage === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    });

    document.title = page === 'contact'
      ? (currentLanguage === 'ar' ? 'تواصل معنا مع Booster AI' : 'Contact Booster AI')
      : (currentLanguage === 'ar' ? 'Booster AI نشخص. نبني. نعزز.' : 'Booster AI Diagnose. Build. Boost.');

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      const descriptions = {
        ar: page === 'contact'
          ? 'خذ أول خطوة نحو استخدام الذكاء الاصطناعي بذكاء مع Booster AI.'
          : 'تساعد Booster AI المؤسسات على تشخيص الاحتياجات التشغيلية، وبناء حلول ذكاء اصطناعي عملية، وتعزيز قيمة الأعمال القابلة للقياس.',
        en: page === 'contact'
          ? 'Take the first step toward using AI more intelligently with Booster AI.'
          : 'Booster AI helps organizations diagnose operational needs, build practical AI solutions, and boost measurable business value.'
      };
      description.content = descriptions[currentLanguage];
    }

    if (formStatus) formStatus.textContent = '';
    setMenu(false);
    if (persist) {
      try { localStorage.setItem('booster-language', currentLanguage); } catch (_) { /* Storage is optional. */ }
    }
  };

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.querySelectorAll('[data-language-toggle]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(currentLanguage === 'ar' ? 'en' : 'ar'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenu(false);
      menuButton?.focus();
    }
  });

  const updateHeader = () => {
    header?.classList.toggle('is-stuck', window.scrollY > 120);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (formStatus) formStatus.textContent = text('contact.localOnly');
  });

  let savedLanguage = 'ar';
  try { savedLanguage = localStorage.getItem('booster-language') === 'en' ? 'en' : 'ar'; } catch (_) { /* Arabic remains the default. */ }
  applyLanguage(savedLanguage, false);
})();
