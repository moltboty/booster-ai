(() => {
  const root = document.documentElement;
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.site-nav');
  const header = document.querySelector('[data-header]');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js');

  if (menuButton && navigation) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      main.inert = false;
      footer.inert = false;
      if (returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      navigation.classList.toggle('is-open', !open);
      document.body.classList.toggle('menu-open', !open);
      main.inert = !open;
      footer.inert = !open;
      if (!open) navigation.querySelector('a')?.focus();
    });

    navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu(false)));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) closeMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (!navigation.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [menuButton, ...navigation.querySelectorAll('a')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const revealItems = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const choiceButtons = [...document.querySelectorAll('[data-choice]')];
  const resultTitle = document.querySelector('[data-result-title]');
  const resultCopy = document.querySelector('[data-result-copy]');
  const copyButton = document.querySelector('[data-copy-brief]');
  const copyStatus = document.querySelector('[data-copy-status]');
  const briefFallback = document.querySelector('[data-brief-fallback]');

  const choiceData = {
    repetition: {
      label: 'Repeated admin',
      evidence: 'examples of repeated steps, approximate frequency, and the systems involved'
    },
    handoffs: {
      label: 'Slow handoffs',
      evidence: 'one delayed handoff, the teams involved, and what information is usually missing'
    },
    reporting: {
      label: 'Manual reporting',
      evidence: 'a sample report, its data sources, review steps, and delivery frequency'
    },
    knowledge: {
      label: 'Knowledge search',
      evidence: 'common questions, current knowledge sources, access rules, and examples of hard-to-find answers'
    }
  };

  const selected = new Set();

  const getBrief = () => {
    const items = [...selected].map((key) => choiceData[key]);
    const evidence = items.map((item) => `- ${item.evidence}`).join('\n');
    return `Booster AI opportunity brief\n\nThe friction patterns we see most often:\n${items.map((item) => `- ${item.label}`).join('\n')}\n\nEvidence to bring to the discovery session:\n${evidence}\n\nGoal: understand the current workflow, identify suitable AI opportunities, and prioritize the smallest useful solution.`;
  };

  const updateAssessment = () => {
    const items = [...selected].map((key) => choiceData[key]);
    choiceButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(selected.has(button.dataset.choice)));
    });

    if (!items.length) {
      resultTitle.textContent = 'Select one or more patterns.';
      resultCopy.textContent = 'We will suggest what evidence to bring to an AI opportunity session.';
      copyButton.disabled = true;
      copyStatus.textContent = '';
      briefFallback.hidden = true;
      return;
    }

    resultTitle.textContent = items.length === 1
      ? `${items[0].label} is a useful place to start.`
      : `${items.length} connected friction patterns are worth mapping.`;
    resultCopy.textContent = `Bring ${items.map((item) => item.evidence).join('; ')}.`;
    copyButton.disabled = false;
    copyStatus.textContent = '';
    briefFallback.hidden = true;
  };

  choiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.choice;
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      updateAssessment();
    });
  });

  copyButton?.addEventListener('click', async () => {
    const brief = getBrief();
    try {
      await navigator.clipboard.writeText(brief);
      copyStatus.textContent = 'Copied. Keep this brief for your discovery conversation.';
      briefFallback.hidden = true;
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = brief;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      textArea.remove();
      if (copied) {
        copyStatus.textContent = 'Copied. Keep this brief for your discovery conversation.';
        briefFallback.hidden = true;
      } else {
        briefFallback.value = brief;
        briefFallback.hidden = false;
        briefFallback.focus();
        briefFallback.select();
        copyStatus.textContent = 'Automatic copy is unavailable. Your complete brief is selected below for manual copying.';
      }
    }
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();
