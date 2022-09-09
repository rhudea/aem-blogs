/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

export default {
    /**
     * Apply DOM operations to the provided document and return
     * the root element to be then transformed to Markdown.
     * @param {HTMLDocument} document The document
     * @param {string} url The url of the page imported
     * @param {string} html The raw html (the document is cleaned up during preprocessing)
     * @param {object} params Object containing some parameters given by the import process.
     * @returns {HTMLElement} The root element to be transformed
     */
    transformDOM: ({
        // eslint-disable-next-line no-unused-vars
        document, url, html, params,
    }) => {

        const metadata = buildMetadata(document);
        // use helper method to remove header, footer, etc.
        WebImporter.DOMUtils.remove(document.body, [
            'header',
            'footer',
            '.caption.content-header__breadcrumb',
            '.chart-box-wrapper',
            '#treeChartModal',
            '.related-container',
            '.fixed-bottom',
            '.modal',
            '.btn-cta',
            '.content-header__date-tag',
            '.media--author',
            '.content-header__relation-title',
            '.whatsnext-container'
        ]);

        const table = WebImporter.DOMUtils.createTable(metadata, document);
        document.querySelector('body').append(table);
        buildReferences(document);
        embedVideo(document);
        return document.body;
    },

    /**
     * Return a path that describes the document being transformed (file name, nesting...).
     * The path is then used to create the corresponding Word document.
     * @param {HTMLDocument} document The document
     * @param {string} url The url of the page imported
     * @param {string} html The raw html (the document is cleaned up during preprocessing)
     * @param {object} params Object containing some parameters given by the import process.
     * @return {string} The path
     */
    generateDocumentPath: ({
        // eslint-disable-next-line no-unused-vars
        document, url, html, params,
    }) => new URL(url).pathname.replace(/\.html$/, '').replace(/\/$/, ''),
};

function capitalize(sentence) {
    if (sentence) {
        sentence = sentence.trim();
        let regex = /&(nbsp|amp|quot|lt|gt);/g;
        sentence = sentence.replace(regex, " ");
        var splitStr = sentence.toLowerCase().split(' ');
        for (var i = 0; i < splitStr.length; i++) {
            // You do not need to check if i is larger than splitStr length, as your for does that for you
            // Assign it back to the array
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        // Directly return the joined string
        return splitStr.join(' ');
    }
}

function buildMetadata(document) {
    const cells = [['Metadata']];
    if (document.querySelector('.content-header__date-tag')) {
        cells.push(['Publication Date', capitalize(document.querySelector('.content-header__date-tag').innerHTML)]);
    }
    if (document.querySelector('.media--author__title')) {
        cells.push(['Author', document.querySelector('.media--author__title').innerHTML]);
    }
    if (document.querySelector('.content-header__title')) {
        cells.push(['Title', document.querySelector('.content-header__title').innerHTML]);
    }
    if (document.querySelector('.apos-rich-text:first-of-type > p')) {
        let desc = document.querySelector('.apos-rich-text:first-of-type > p').innerHTML;
        if (desc.length > 0) {
            desc = desc.substring(0, 100) + '...';
        }
        cells.push(['Description', desc]);
    }

    const tags = getTags(document);
    cells.push(['Tags', Array.from(tags).join(',')]);

    const contentHeader = document.querySelector('.caption.content-header__breadcrumb > a');
    if (contentHeader) {
        const category = capitalize(contentHeader.getAttribute('href').split('/')[1]);
        cells.push([category, document.querySelector('.caption.content-header__breadcrumb > a').innerHTML.trim()]);
    }
    return cells;
}

function buildReferences(document) {
    const regex = /&(nbsp|amp|quot|lt|gt);/g;
    const ul = document.createElement('ol');
    document.querySelectorAll('.h5').forEach(element => {
        if (element.innerHTML === 'References') {
            const parent = element.parentNode;
            element.nextElementSibling.innerHTML.split('<br>').forEach((item) => {
                const numPrefixRegex = /\d+\s/;
                const li = document.createElement('li');
                item = item.replace(regex, ' ').replace(numPrefixRegex, '');
                li.innerHTML = item;
                ul.append(li);
            });
            parent.innerHTML = '';
            parent.append(element);
            parent.append(ul);
        }
    });
}

function embedVideo(document) {
    document.querySelectorAll('[data-apos-widget="video-embed"] iframe').forEach((item) => {
        const cells = [['embed']];
        const src = item.getAttribute('src');
        const link = document.createElement('a');
        link.href = src;
        link.textContent = link.href;
        cells.push([link]);
        const parent = item.parentNode;
        parent.innerHTML = '';
        const table = WebImporter.DOMUtils.createTable(cells, document);
        parent.append(table);

    });
}

function getTags(document) {
    const tags = document.querySelectorAll('.tag-group > a');
    const tagSet = new Set();
    if(tags) {
        tags.forEach((tag) => {
            tagSet.add(capitalize(tag.textContent));
        });
    }
    return tagSet;
}