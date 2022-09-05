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

        const cells = [
            ['Metadata'],
            ['Title', document.querySelector('.content-header__title').innerHTML],
            ['Description', document.querySelector('.apos-rich-text:first-of-type > p').innerHTML.substring(0, 100) + '...'],
            ['Publication Date', document.querySelector('.content-header__date-tag').innerHTML]
        ];

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
            '.content-header__date-tag'
        ]);

        const table = WebImporter.DOMUtils.createTable(cells, document);
        document.querySelector('body').append(table);

        
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