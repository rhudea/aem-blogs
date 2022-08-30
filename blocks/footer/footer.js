import {
  debug,
} from '../../scripts/scripts.js';
import { createTag } from '../block-helpers.js';

const ADCHOICE_IMG = '<img class="footer-link-img" loading="lazy" src="/blocks/footer/adchoices-small.svg">';

class Footer {
  constructor(body, el) {
    this.el = el;
    this.body = body;
    this.desktop = window.matchMedia('(min-width: 900px)');
  }

  init = async () => {
    this.state = {};
    const wrapper = createTag('div', { class: 'footer-wrapper' });

    const grid = this.decorateGrid();
    if (grid) {
      wrapper.append(grid);
    }

    const infoRow = createTag('div', { class: 'footer-info' });
    const infoColumnLeft = createTag('div', { class: 'footer-info-column' });
    const infoColumnRight = createTag('div', { class: 'footer-info-column' });

    const social = this.decorateSocial();
    if (social) {
      infoColumnLeft.append(social);
      infoRow.classList.add('has-social');
    }

    const privacy = this.decoratePrivacy();
    if (privacy) {
      infoColumnRight.append(privacy);
      infoRow.classList.add('has-privacy');
    }

    if (infoColumnLeft.hasChildNodes()) {
      infoRow.append(infoColumnLeft);
    }
    if (infoColumnRight.hasChildNodes()) {
      infoRow.append(infoColumnRight);
    }
    if (infoRow.hasChildNodes()) {
      wrapper.append(infoRow);
    }

    this.el.append(wrapper);
  }

  decorateGrid = () => {
    const gridBlock = this.body.querySelector('.footer-links > div');
    if (!gridBlock) return null;
    this.desktop.addEventListener('change', this.onMediaChange);
    // build grid container
    const navGrid = createTag('div', { class: 'footer-nav-grid' });
    const columns = gridBlock.querySelectorAll('div');
    columns.forEach((column) => {
      // build grid column
      const navColumn = createTag('div', { class: 'footer-nav-column' });
      const headings = column.querySelectorAll('h2');
      headings.forEach((heading) => {
        // build grid column item
        const navItem = createTag('div', { class: 'footer-nav-item' });
        const titleId = heading.textContent.trim().toLowerCase().replace(/ /g, '-');
        let expanded = false;
        if (this.desktop.matches) { expanded = true; }
        // populate grid column item
        const title = createTag('h4', {
          class: 'footer-nav-item-title',
          role: 'button',
          'aria-expanded': expanded,
          'aria-controls': `${titleId}-menu`,
        });
        title.textContent = heading.textContent;
        navItem.append(title);
        const linksContainer = heading.nextElementSibling;
        linksContainer.classList = 'footer-nav-item-links';
        linksContainer.id = `${titleId}-menu`;
        if (!this.desktop.matches) {
          title.addEventListener('click', this.toggleMenu);
        }
        const links = linksContainer.querySelectorAll('li');
        links.forEach((link) => {
          link.classList.add('footer-nav-item-link');
        });
        navItem.append(linksContainer);
        navColumn.append(navItem);
      });
      navGrid.append(navColumn);
    });
    return navGrid;
  }

  decorateSocial = () => {
    const socialEl = this.body.querySelector('.social > div');
    if (!socialEl) return null;
    // build social icon wrapper
    const socialWrapper = createTag('div', { class: 'footer-social' });
    // build social icon links
    const socialLinks = createTag('ul', { class: 'footer-social-icons' });
    socialEl.querySelectorAll('a').forEach((a) => {
      const domain = a.host.replace(/www./, '').replace(/.com/, '');
      const supported = ['facebook', 'instagram', 'twitter', 'linkedin'];
      if (supported.includes(domain)) {
        // populate social icon links
        const li = createTag('li', { class: 'footer-social-icon' });
        const socialIcon = createTag('img', {
          class: 'footer-social-img',
          loading: 'lazy',
          src: `/blocks/footer/${domain}-square.svg`,
        });
        a.textContent = '';
        a.append(socialIcon);
        li.append(a);
        socialLinks.append(li);
      } else { a.remove(); }
      socialWrapper.append(socialLinks);
    });
    return socialWrapper;
  }

  decoratePrivacy = () => {
    const copyrightEl = this.body.querySelector('div em');
    const links = copyrightEl.parentElement.querySelectorAll('a');
    if (!copyrightEl || !links) return null;
    // build privacy wrapper
    const privacyWrapper = createTag('div', { class: 'footer-privacy' });
    // build privacy copyright text
    const copyright = createTag('p', { class: 'footer-privacy-copyright' });
    copyright.textContent = copyrightEl.textContent;
    privacyWrapper.append(copyright);
    // build privacy links
    const infoLinks = createTag('ul', { class: 'footer-privacy-links' });
    // populate privacy links
    links.forEach((link) => {
      const li = createTag('li', { class: 'footer-privacy-link' });
      if (link.hash === '#interest-based-ads') {
        link.insertAdjacentHTML('afterbegin', ADCHOICE_IMG);
      }
      li.append(link);
      infoLinks.append(li);
    });
    privacyWrapper.append(infoLinks);
    return privacyWrapper;
  }

  toggleMenu = (e) => {
    const button = e.target.closest('[role=button]');
    const expanded = button.getAttribute('aria-expanded');
    if (expanded === 'true') {
      this.closeMenu(button);
    } else {
      this.openMenu(button);
    }
  }

  closeMenu = (el) => {
    el.setAttribute('aria-expanded', false);
  }

  openMenu = (el) => {
    const type = el.classList[0];
    const expandedMenu = document.querySelector(`.${type}[aria-expanded=true]`);
    if (expandedMenu) { this.closeMenu(expandedMenu); }
    el.setAttribute('aria-expanded', true);
  }

  toggleOnKey = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      this.toggleMenu(e);
    }
  }


  onMediaChange = (e) => {
    if (e.matches) {
      document.querySelectorAll('.footer-nav-item-title').forEach((button) => {
        button.setAttribute('aria-expanded', true);
        button.removeEventListener('click', this.toggleMenu);
      });
    } else {
      document.querySelectorAll('.footer-nav-item-title').forEach((button) => {
        button.setAttribute('aria-expanded', false);
        button.addEventListener('click', this.toggleMenu);
      });
    }
  };
}

async function fetchFooter(url) {
  const resp = await fetch(`${url}.plain.html`);
  const html = await resp.text();
  return html;
}

export default async function init(block) {
  const url = block.getAttribute('data-footer-source');
  if (url) {
    const html = await fetchFooter(url);
    if (html) {
      try {
        const parser = new DOMParser();
        const footerDoc = parser.parseFromString(html, 'text/html');
        const footer = new Footer(footerDoc.body, block);
        footer.init();
      } catch {
        debug('Could not create footer.');
      }
    }
  }
}
