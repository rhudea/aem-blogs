import {
  createOptimizedPicture,
  //fetchPlaceholders
} from '../../scripts/lib-franklin.js';


import {
  buildFigure,
  fetchPlaceholders,
  getMetadata
} from '../../scripts/scripts.js';

import {
  createSVG,
} from '../block-helpers.js';

async function populateAuthorInfo(authorLink, imgContainer, url, name, eager = false) {
  const resp = await fetch(`${url}.plain.html`);
  if (resp.ok) {
    const text = await resp.text();
    const placeholder = document.createElement('div');
    placeholder.innerHTML = text;
    const placeholderImg = placeholder.querySelector('img');
    if (placeholderImg) {
      const src = new URL(placeholderImg.getAttribute('src'), new URL(url));
      const picture = createOptimizedPicture(src, name, eager, [{ width: 200 }]);
      imgContainer.append(picture);
      const img = picture.querySelector('img');
      if (!img.complete) {
        img.addEventListener('load', () => {
          // remove default background image to avoid halo
          imgContainer.style.backgroundImage = 'none';
        });
        img.addEventListener('error', () => {
          // removing 404 img will reveal fallback background img
          img.remove();
        });
      } else {
        // remove default background image to avoid halo
        imgContainer.style.backgroundImage = 'none';
      }
    }
  } else {
    const p = document.createElement('p');
    p.innerHTML = authorLink.innerHTML;
    authorLink.replaceWith(p);
  }
}

function openPopup(e) {
  const target = e.target.closest('a');
  const href = target.getAttribute('data-href');
  const type = target.getAttribute('data-type');
  window.open(
    href,
    type,
    'popup,top=233,left=233,width=700,height=467',
  );
}

function copyToClipboard(button) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const copied = document.querySelector('.copied-to-clipboard');
    if (!copied) {
      fetchPlaceholders().then((placeholders) => {
        button.setAttribute('title', placeholders['copied-to-clipboard']);
        const toolTip = document.createElement('div');
        toolTip.setAttribute('role', 'status');
        toolTip.setAttribute('aria-live', 'polite');
        toolTip.classList.add('copied-to-clipboard');
        toolTip.textContent = placeholders['copied-to-clipboard'];
        button.append(toolTip);
        setTimeout(() => {
          toolTip.remove();
        }, 5000);
      });
    }
    button.classList.remove('copy-failure');
    button.classList.add('copy-success');
  }, () => {
    button.classList.remove('copy-success');
    button.classList.add('copy-failure');
  });
}

function buildSharing() {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.querySelector('h1').textContent);
  const description = encodeURIComponent(getMetadata('description'));
  const sharing = document.createElement('div');
  sharing.classList.add('article-social-sharing');
  sharing.innerHTML = `<span>
      <a data-type="Twitter" data-href="https://www.twitter.com/share?&url=${url}&text=${title}">
        ${createSVG('twitter').outerHTML}
      </a>
    </span>
    <span>
      <a data-type="LinkedIn" data-href="https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${description || ''}">
        ${createSVG('linkedin').outerHTML}
      </a>
    </span>
    <span>
      <a data-type="Facebook" data-href="https://www.facebook.com/sharer/sharer.php?u=${url}">
        ${createSVG('facebook').outerHTML}
      </a>
    </span>
    <span>
      <a id="copy-to-clipboard">
        ${createSVG('link').outerHTML}
      </a>
    </span>`;
  sharing.querySelectorAll('[data-href]').forEach((link) => {
    link.addEventListener('click', openPopup);
  });
  const copyButton = sharing.querySelector('#copy-to-clipboard');
  copyButton.addEventListener('click', () => {
    copyToClipboard(copyButton);
  });
  return sharing;
}

export default async function decorateArticleHeader(blockEl, blockName, document, eager) {
  const childrenEls = Array.from(blockEl.children);
  // category
  const categoryContainer = childrenEls[0];
  categoryContainer.classList.add('article-category');
  // title
  const titleContainer = childrenEls[1];
  titleContainer.classList.add('article-title');

  const headerInfo = childrenEls[2];
  headerInfo.classList.add('article-date');

  const authorsContainer = childrenEls[3];
  authorsContainer.classList.add('article-authors');
  authorsContainer.firstChild.classList.add('article-authors-info');
  decorateAuthors(authorsContainer, eager);

  // sharing
  const shareBlock = buildSharing();
  authorsContainer.append(shareBlock);

  // feature img
  const featureImgContainer = childrenEls[4];
  featureImgContainer.classList.add('article-feature-image');
  const featureFigEl = buildFigure(featureImgContainer.firstChild);
  featureFigEl.classList.add('figure-feature');
  featureImgContainer.prepend(featureFigEl);
  featureImgContainer.lastChild.remove();
}

function decorateAuthors(authorsContainer, eager) {
  authorsContainer.querySelectorAll(':scope > div > div').forEach((author) => {
    author.classList.add('article-author');
    const authorLink = author.querySelector('a');
    const authorURL = authorLink.href;
    const authorName = author.textContent;
    const authorImg = document.createElement('div');
    authorImg.classList = 'article-author-image';
    authorImg.style.backgroundImage = 'url(/blocks/article-header/alexforbes-connector.svg)';
    author.prepend(authorImg);
    populateAuthorInfo(authorLink, authorImg, authorURL, authorName, eager);
  });

}
