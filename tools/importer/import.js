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
        //console.log(articleTagDict);
        const metadata = buildMetadata(document, url);
        const addlMaterials = buildAdditionalMaterials(document);
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
            '.whatsnext-container',
            '.additional-resource-component'
        ]);
        const table = WebImporter.DOMUtils.createTable(metadata, document);
        document.querySelector('body').append(table);
        buildReferences(document);
        embedVideo(document);
        if (addlMaterials.length > 1) {
            document.querySelector('body').append(WebImporter.DOMUtils.createTable(addlMaterials, document));
        }
        document.querySelectorAll('u').forEach((u) => {
            const span = document.createElement('span');
            span.innerHTML = u.innerHTML;
            u.replaceWith(span);
        });
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

function buildMetadata(document, url) {
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

    //const tags = getTags(document);
    //cells.push(['Tags', Array.from(tags).join(',')]);
    const tags = articleTagDict[formImportedUrl(url)];
    cells.push(['Tags', tags.join(',')]);


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
    if (tags) {
        tags.forEach((tag) => {
            tagSet.add(capitalize(tag.textContent));
        });
    }
    return tagSet;
}

function buildAdditionalMaterials(document) {
    const cells = [['Additional Materials']];
    document.querySelectorAll('.additional-resource-component').forEach((arc) => {
        const title = arc.querySelector('.additional-resource-component__media-type-title').textContent.trim();
        const heading = arc.querySelector('.additional-resource-component__media-content-container > .h2').textContent.trim();
        const caption = arc.querySelector('.additional-resource-component__media-content-container > .caption').textContent.trim();
        let href;
        if (arc.querySelector('a')) {
            href = arc.querySelector('a').getAttribute('href');
            href = href.replace('https:\/\/thought-leadership.azureedge.net\/website\/attachments\/', 'https://main--aem-blogs--alexander-forbes.hlx.page/assets/pdf/');
            if (!href.toLowerCase().endsWith('.pdf')) {
                console.log('\Non PDF material: ' + href);
            }
        } else  if (arc.querySelector('.additional-resource-component__media-macro-container')) {
            const iframe = arc.querySelector('.additional-resource-component__media-macro-container').querySelector('iframe');
            if(iframe) {
                href = iframe.getAttribute('src');
            }
        }
        const size = arc.querySelector('.additional-resource-component__media-type-info').textContent.trim();
        const classList = arc.querySelector('.additional-resource-component__media-type-info').classList;
        let mtype;
        classList.forEach((token) => {
            if (token.startsWith('mType')) {
                mtype = token;
            }
        })
        cells.push([[title], [heading], [caption], [href], [size], [mtype]]);
    });
    return cells;
}

function buildArticleTagsMap() {
    const articleTags = ['https://research.alexanderforbes.com/parts/part-a-benefits-model-for-south-africa,Insights,Behavioural finance,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-a-better-model-activation,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-a-matter-of-health,Financial well-being,Healthcare',
        'https://research.alexanderforbes.com/parts/part-a-multistakeholder-approach-to-overcoming-the-barriers-to-a-well-being-economy,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-a-new-approach-for-deploying-compulsory-savings,Insights,Employee Benefits,Trustees,Investments',
        'https://research.alexanderforbes.com/topics/a-six-year-retrospective-of-benefits-barometer,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-a-unifying-framework-for-incentivising-inclusive-dev,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-a-workplace-where-employees-can-thrive,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-absenteeism-and-incapacity,Insights,Employee Benefits,Healthcare,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-absenteeism-and-presenteeism,Insights,Employee Benefits,Healthcare,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-achieving-a-long-term-care-solution-in-south-africa,Healthcare,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-action-points-getting-to-that-well-being-workplace,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-action-points-social-mobility-for-a-well-being-economy,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-action-points-the-role-of-stakeholders-in-building-a-well-being-discourse,Healthcare,Economy',
        'https://research.alexanderforbes.com/chapters/africa,Investments',
        'https://research.alexanderforbes.com/chapters/africa-as-an-integrated-network-of-partnerships,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-an-action-plan-for-ageing-reform-2,Healthcare,Retirement',
        'https://research.alexanderforbes.com/parts/asset-allocation,Investments',
        'https://research.alexanderforbes.com/parts/asset-classes,Investments',
        'https://research.alexanderforbes.com/parts/asset-management-industry-in-south-africa,Investments',
        'https://research.alexanderforbes.com/chapters/asset-manager-excellence,Investments',
        'https://research.alexanderforbes.com/chapters/asset-manager-fees,Investments',
        'https://research.alexanderforbes.com/chapters/asset-manager-styles,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-at-what-cost-understanding-the-link-between-costs-and-value,Insights,Behavioural finance,Employee Benefits,Investments',
        'https://research.alexanderforbes.com/parts/behavioural-finance-decision-making-and-investing,Behavioural finance,Investments',
        'https://research.alexanderforbes.com/parts/benchmark-debates,Investments',
        'https://research.alexanderforbes.com/parts/part-benefits-that-matter-life-planning-tools,Insights,Employee Benefits,Financial well-being,Healthcare,Retirement',
        'https://research.alexanderforbes.com/chapters/bonds-income,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-bricks-and-books-and-beyond,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-bricks-and-books-when-can-benefits-be-so-much-more,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-building-a-better-annuity-solution,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-holistic-well-being-programmes,Insights,Behavioural finance,Employee Benefits,Financial well-being,Healthcare,Trustees',
        'https://research.alexanderforbes.com/parts/capital-markets-why-do-they-exist,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-case-study-on-collaboration,Healthcare,Retrenchment,Economy',
        'https://research.alexanderforbes.com/chapters/change-and-accountability,Economy',
        'https://research.alexanderforbes.com/chapters/change-and-inclusion,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-choice,Insights,Behavioural finance,Employee Benefits,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-choice-when-more-can-be-less,Insights,Behavioural finance,Employee Benefits,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-collaborating-and-leveraging-for-well-being,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-collaboration-toolkit2,Financial well-being,Retirement,Retrenchment,Economy',
        'https://research.alexanderforbes.com/parts/conclusions-and-assumptions,Economy',
        'https://research.alexanderforbes.com/chapters/conflicts-of-interest,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-connectedness,Insights,Behavioural finance,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/parts/considerations-for-trustees,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/construction-industry,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-controlling-health-costs,Insights,Employee Benefits,Financial well-being,Healthcare',
        'https://research.alexanderforbes.com/chapters/chapter-coping-with-complexity-balancing-affordability-and-in-medical-schemes,Insights,Employee Benefits,Healthcare,Trustees,Retirement',
        'https://research.alexanderforbes.com/parts/costs-and-fees-vs-value,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-could-we-do-the-same-thing-in-south-africa,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/topics/pub-creating-the-well-being-econo,Healthcare,Retirement,Economy',
        'https://research.alexanderforbes.com/parts/part-crowdsourcing-for-south-africa-s-future,Economy',
        'https://research.alexanderforbes.com/chapters/decision-making-and-boards-of-pension-funds,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/decision-making-by-members-of-pension-funds,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/defaults,Investments',
        'https://research.alexanderforbes.com/parts/demographic-crisi,Retirement',
        'https://research.alexanderforbes.com/chapters/derivatives-and-the-cost-of-peace-of-mind,Investments',
        'https://research.alexanderforbes.com/chapters/disruption-in-the-financial-services-industry,Investments',
        'https://research.alexanderforbes.com/chapters/diy-investing,Investments',
        'https://research.alexanderforbes.com/chapters/does-investing-in-the-jse-stimulate-growth,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-driving-inclusive-growth-through-targeted-investment,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-early-childhood-learning-a-heading-start-in-life0,Financial well-being',
        'https://research.alexanderforbes.com/chapters/economic-theory-re-imagined,Investments,Economy',
        'https://research.alexanderforbes.com/parts/economics-politics-capital-markets-and-investing,Investments,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-education-the-engine-room-for-social-mobility5,Financial well-being,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-emergency-savings-a-novel-approach,Insights,Behavioural finance,Employee Benefits,Trustees,Investments,Retrenchment',
        'https://research.alexanderforbes.com/topics/employee-benefits-and-social-protections-in-africa,Employee Benefits',
        'https://research.alexanderforbes.com/parts/employee-well-being-can-be-achieved,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-employer-employee-relations-of-the-future,Healthcare,Retrenchment,Economy',
        'https://research.alexanderforbes.com/chapters/esg-investing,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-exploring-policy-debates-in-south-africa,Healthcare,Trustees,Economy',
        'https://research.alexanderforbes.com/chapters/factor-investing-and-smart-beta,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-failure-to-launch-why-financial-education-is-failing,Insights,Behavioural finance,Employee Benefits,Trustees,Economy',
        'https://research.alexanderforbes.com/chapters/fdi-and-multinational,Economy',
        'https://research.alexanderforbes.com/chapters/fiduciary,Investments',
        'https://research.alexanderforbes.com/chapters/financial-advice-model-of-the-future,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-financial-assessment-toolkit,Financial well-being,Retirement,Retrenchment',
        'https://research.alexanderforbes.com/chapters/financial-education,Investments',
        'https://research.alexanderforbes.com/parts/financial-regulation,Investments',
        'https://research.alexanderforbes.com/chapters/financial-solutions-for-diverse-populations,Investments',
        'https://research.alexanderforbes.com/parts/part-financial-solutions-for-retirement-the-underappreciated-annuity,Trustees,Investments,Retirement',
        'https://research.alexanderforbes.com/topics/pub-financial-well-being,Financial well-being,Healthcare,Retirement,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-financial-well-being-from-insight-to-action,Financial well-being,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-financial-wellness-why-it-isnt-working,Insights,Behavioural finance,Financial well-being,Trustees',
        'https://research.alexanderforbes.com/topics/pub-fine-tuning-the-employee-benefits-system,Retirement',
        'https://research.alexanderforbes.com/chapters/fishing-forestry-and-agriculture,Economy',
        'https://research.alexanderforbes.com/parts/part-fleshing-out-the-vision-a-better-model,Employee benefits',
        'https://research.alexanderforbes.com/parts/fragmentation-has-led-to-an-ineffective-employee-support-system,Employee benefits',
        'https://research.alexanderforbes.com/chapters/from-paternalism-to-self-determination,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-getting-creative-about-value-creation,Employee benefits',
        'https://research.alexanderforbes.com/parts/getting-this-right-will-demand-changes,Employee benefits',
        'https://research.alexanderforbes.com/chapters/global-investing,Investments',
        'https://research.alexanderforbes.com/parts/goals-based-investment-strategies,Investments',
        'https://research.alexanderforbes.com/chapters/goals-based-solutions-for-retirement,Investments,Retirement',
        'https://research.alexanderforbes.com/chapters/governance-budgeting,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-grappling-with-the-conflicts-and-contradictions-that-may-lie-ahead,Insights,Employee Benefits,Trustees,Economy',
        'https://research.alexanderforbes.com/chapters/healthcare-2,Healthcare',
        'https://research.alexanderforbes.com/chapters/chapter-healthcare-and-resilience-toolkit2,Insights,Behavioural finance,Financial well-being,Healthcare,Retirement,Retrenchment',
        'https://research.alexanderforbes.com/chapters/hedge-funds-and-alternatives,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-high-employee-turnover,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-high-salary-inflation-the-downside,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-housing-the-building-block-for-wealth-creation7,Insights,Employee Benefits,Financial well-being,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-how-has-it-changed-the-role-of-financial-services,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/how-successful-are-compulsory-savings-for-retirement,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-how-the-brain-tricks-us,Insights,Behavioural finance,Financial well-being,Trustees,Investments',
        'https://research.alexanderforbes.com/parts/how-to-change-our-mindset-about-change-for-africa,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/parts/part-how-we-need-to-respond-in-a-changing-world-of-work7,Retrenchment,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-impact-investing,Trustees,Investments,Economy',
        'https://research.alexanderforbes.com/chapters/implications-of-covid-19-on-employee-benefits-2,Employee benefits',
        'https://research.alexanderforbes.com/chapters/chapter-incapacity,Healthcare,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-can-the-right-incentives-lead-to-the-right-behaviour,Insights,Behavioural finance,Employee Benefits,Trustees,Economy',
        'https://research.alexanderforbes.com/parts/part-individual-well-being-and-the-well-being-economy,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-informal-workers,Insights,Employee Benefits,Trustees,Retrenchment',
        'https://research.alexanderforbes.com/chapters/information-overload,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-innovation,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-insights-from-the-iras-data,Trustees',
        'https://research.alexanderforbes.com/parts/part-insights-into-the-employee-benefits-system,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-insuring-what-matters,Insights,Behavioural finance,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-introducing-the-well-being-economy,Economy',
        'https://research.alexanderforbes.com/chapters/investing-for-impact,Investments',
        'https://research.alexanderforbes.com/parts/investing-for-individuals,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-investing-in-a-time-of-crisis,Insights,Behavioural finance,Financial well-being,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/investment-decision-making-biases,Behavioural finance,Investments',
        'https://research.alexanderforbes.com/chapters/investment-myths-for-trustees-to-engage-with,Trustees,Investments',
        'https://research.alexanderforbes.com/parts/investment-philosophies-styles,Investments',
        'https://research.alexanderforbes.com/parts/part-investment-solutions-for-retirement-the-goals-that-matter,Insights,Behavioural finance,Trustees,Investments,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-why-emergency-savings-are-key,Insights,Behavioural finance,Financial well-being,Trustees,Investments,Retrenchment',
        'https://research.alexanderforbes.com/parts/know-your-rights-on-retrenchment,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-learning-from-the-informal-sector,Insights,Behavioural finance,Financial well-being,Economy',
        'https://research.alexanderforbes.com/parts/lens-of-responsibility,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/liability-driven-investing,Investments',
        'https://research.alexanderforbes.com/chapters/lifestage-investing,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-living-annuities-living-on-the-fault-line,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-longevity,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/parts/part-longevity-the-demographic-disruptor9,Healthcare,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-longevity-why-75-should-be-the-new-65,Trustees,Retirement',
        'https://research.alexanderforbes.com/parts/part-looking-at-the-numbers,Behavioural finance,Financial well-being,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-low-income-earners-and-incentives,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-low-income-earners-earn-too-little-to-save,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-managing-risk,Retirement',
        'https://research.alexanderforbes.com/chapters/manufacturing,Economy',
        'https://research.alexanderforbes.com/chapters/market-bubbles,Investments,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-mass-exits,Insights,Employee Benefits,Trustees,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-mass-exits-coping-with-the-downturn,Insights,Employee Benefits,Trustees,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-measuring-success-how-do-we-know-if-individuals-are-winning,Insights,Employee Benefits,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-meet,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-mental-health-in-workplace,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-mental-models,Insights,Behavioural finance,Financial well-being',
        'https://research.alexanderforbes.com/chapters/migration-and-skills-transfer,Trustees',
        'https://research.alexanderforbes.com/chapters/millennials,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-mind-the-gap-aligning-hr-policies-with-employee-benefit,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-mindsets-about-money,Insights,Behavioural finance,Financial well-being',
        'https://research.alexanderforbes.com/chapters/mining,Economy',
        'https://research.alexanderforbes.com/chapters/mortality-improvements-in-south-africa-insights-from-pensioner-mortality,Retirement',
        'https://research.alexanderforbes.com/parts/part-navigating-individual-financial-well-being,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/objectives-governance-the-international-experience,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-parting-shot-or-the-beginning-of-benefits-barometer-all,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/parts/pension-reform-globally,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-pensionable-pay,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-pensionable-pay-the-law-of-unintended-consequences,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/parts/performance-measurement,Investments',
        'https://research.alexanderforbes.com/chapters/performance-reporting,Investments',
        'https://research.alexanderforbes.com/chapters/personal-services,Economy',
        'https://research.alexanderforbes.com/chapters/phi-and-why-it-matters,Investments',
        'https://research.alexanderforbes.com/chapters/picking-a-financial-expert,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-planning-for-a-better-ending2,Financial well-being,Retirement',
        'https://research.alexanderforbes.com/chapters/politics-and-investing,Investments',
        'https://research.alexanderforbes.com/parts/post-covid-challenges-for-employers,Employee benefits',
        'https://research.alexanderforbes.com/chapters/chapter-product-options,Financial well-being',
        'https://research.alexanderforbes.com/chapters/professional-services,Investments',
        'https://research.alexanderforbes.com/chapters/property-investing,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-prospects-for-the-retirement-process-in-south-africa-how-are-we-doing-here-2,Healthcare,Trustees,Retirement',
        'https://research.alexanderforbes.com/chapters/public-services,Investments',
        'https://research.alexanderforbes.com/chapters/putting-the-spotlight-on-annuities,Investments',
        'https://research.alexanderforbes.com/chapters/rebalancing,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-re-imagining-long-term-care,Healthcare,Retirement,Economy',
        'https://research.alexanderforbes.com/chapters/remember-paradigm-shifts,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/parts/responsible-sustainable-investing,Investments',
        'https://research.alexanderforbes.com/chapters/retail-wholesale-and-hospitality,Investments',
        'https://research.alexanderforbes.com/chapters/rethinking-the-business-culture-of-financial-services,Investments',
        'https://research.alexanderforbes.com/parts/part-rethinking-the-employee-benefits-model,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/topics/pub-retirement-why-we-need-to-radically-change-our-thinking,Healthcare,Retirement',
        'https://research.alexanderforbes.com/parts/retirement-is-not-south-african-s-top-priority,Employee benefits,Retirement',
        'https://research.alexanderforbes.com/parts/retirement-savings-required-to-generate-adequate-income,Retirement',
        'https://research.alexanderforbes.com/parts/retrenchment-as-t,Retrenchment',
        'https://research.alexanderforbes.com/chapters/retrenchments-in-times-of-crisis,Retrenchment',
        'https://research.alexanderforbes.com/topics/retrenchment-understanding-its-impact,Healthcare,Retrenchment',
        'https://research.alexanderforbes.com/parts/risk,Investments',
        'https://research.alexanderforbes.com/parts/risk-benefits-and-expenses-deductio,Employee benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/risk-budgeting,Trustees',
        'https://research.alexanderforbes.com/parts/sector-analysis,Investments',
        'https://research.alexanderforbes.com/parts/selecting-an-asset-manager,Investments',
        'https://research.alexanderforbes.com/parts/part-setting-the-scene,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-shifting-sands-families-on-the-move-2,Financial well-being,Retirement,Economy',
        'https://research.alexanderforbes.com/parts/should-saving-for-retirement-be-a-top-priority-for-developing-economies,Employee Benefits,Trustees,Investments,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-skills-development-new-approach,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-skills-income-and-on-going-work-toolkit2,Financial well-being,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-solving-for-smmes-and-sole-proprietors,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-south-africas-skills-development-journey,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-how-weve-lost-the-plot-on-member-communications,Insights,Behavioural finance,Employee Benefits,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-strikes,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-strikes-the-part-that-doesn-t-make-headlines,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/surveys,Investments',
        'https://research.alexanderforbes.com/parts/part-workplace-solutions-to-the-next-level,Financial well-being',
        'https://research.alexanderforbes.com/chapters/tax-free-savings,Investments',
        'https://research.alexanderforbes.com/chapters/technology,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-temporary-and-informal-workers-that-benefits-forgot,Insights,Employee Benefits,Trustees,Retrenchment,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-temporary-workers,Trustees,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-the-cost-of-commuting,Financial well-being,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-the-demographics-of-ageing-in-south-africa8,Healthcare,Retirement,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-the-diversity-imperative,Economy',
        'https://research.alexanderforbes.com/parts/the-economic-impact-of-retrenchment,Retrenchment',
        'https://research.alexanderforbes.com/topics/pub-the-employee-benefits-system,Insights,Employee Benefits,Healthcare,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-employee-benefits-system-and-inter-dependencies,Insights,Employee Benefits,Healthcare,Trustees',
        'https://research.alexanderforbes.com/chapters/the-future-of-investing,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-the-goals-that-matter4,Insights,Behavioural finance,Trustees,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-the-heart-of-the-matter-what-do-individuals-need,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/parts/part-the-issues-revisited-barriers-to-employee-benefit-success,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/parts/part-the-issues-that-hinder-the-improvement,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-the-journey-on-autopilot-knowing-when-and-how-to-use-defaults,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-the-journey-not-just-the-end-game,Insights,Behavioural finance,Employee Benefits,Trustees,Economy',
        'https://research.alexanderforbes.com/chapters/the-legal-environment-for-governance,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-the-modern-organisation,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-the-need-for-gender-equality,Workplace environment',
        'https://research.alexanderforbes.com/parts/part-the-new-landscape-for-work,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-the-new-language,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-the-outcomes-of-the-employee-benefits-system,Insights,Employee Benefits,Healthcare,Trustees',
        'https://research.alexanderforbes.com/chapters/the-private-public-model-for-social-protection-in-emerging-economies,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-the-promise-of-workforce-analytics,Retrenchment',
        'https://research.alexanderforbes.com/parts/the-psychological-impact-of-retrenchment,Insights,Behavioural finance,Retrenchment',
        'https://research.alexanderforbes.com/parts/the-road-to-good-governance,Employee Benefits',
        'https://research.alexanderforbes.com/parts/part-the-role-of-financial-products-in-creating-well-being,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-the-structural-barriers-to-well-being-and-social-mobility,Economy',
        'https://research.alexanderforbes.com/parts/the-value-chain-in-investing,Investments',
        'https://research.alexanderforbes.com/parts/part-the-workplace-and-the-older-worke,Retirement,Retrenchment',
        'https://research.alexanderforbes.com/parts/part-the-workplace-as-a-micro-environment-for-creating-a-well-being-economy,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-time-for-a-benefits-programme-for-south-africans,Insights,Employee Benefits,Trustees,Economy',
        'https://research.alexanderforbes.com/chapters/transformation,Investments',
        'https://research.alexanderforbes.com/chapters/transport-and-telecommunications,Investments',
        'https://research.alexanderforbes.com/chapters/umbrella-funds,Employee Benefits,Trustees,Retirement',
        'https://research.alexanderforbes.com/parts/part-understanding-decision-making,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/chapter-understanding-employees-in-context,Insights,Behavioural finance,Employee Benefits',
        'https://research.alexanderforbes.com/parts/part-the-bigger-picture-on-improving-employee-engagement,Insights,Employee Benefits',
        'https://research.alexanderforbes.com/parts/understanding-the-context-for-social-protections-in-africa,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-unhealthy-finances,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-unhealthy-finances-employees-on-the-edge,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/urbanisation,Trustees',
        'https://research.alexanderforbes.com/parts/use-and-abuse-of-numbers,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-value-to-customers,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-variability-in-salary-inflation,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/parts/part-what-counts,Financial well-being',
        'https://research.alexanderforbes.com/chapters/what-do-employers-want-from-employee-benefits,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-what-do-our-members-want,Insights,Behavioural finance,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-what-do-we-mean-by-well-being,Financial well-being,Economy',
        'https://research.alexanderforbes.com/topics/what-investors-need-to-know-for-effective-decision-making,Investments',
        'https://research.alexanderforbes.com/chapters/chapter-what-is-the-new-landscape-of-work,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-what-is-the-right-social-need,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-what-is-the-value-of-employee-benefits2,Insights,Employee Benefits,Economy',
        'https://research.alexanderforbes.com/parts/what-kind-of-income-does-each-rand-of-savings-buy,Retrenchment',
        'https://research.alexanderforbes.com/chapters/chapter-what-matters-in-the-end,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-what-video-games-can-teach-business-about-engagement,Insights,Behavioural finance',
        'https://research.alexanderforbes.com/chapters/chapter-what-we-need-to-understand-about-demographic-change-in-south-africa-2,Retirement,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-whats-the-context-the-role-of-culture,Insights,Behavioural finance,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-whats-the-point-making-targets-meaningful-to-members,Insights,Employee Benefits,Trustees,Investments,Retirement',
        'https://research.alexanderforbes.com/parts/where-employers-can-add-value,Employee Benefits',
        'https://research.alexanderforbes.com/chapters/chapter-whos-responsible-the-role-of-each-stakeholder,Employee Benefits',
        'https://research.alexanderforbes.com/parts/part-whose-job-is-this-and-how-do-we-get-it-done,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-why-changing-world-of-work-matters-to-retirement-funds,Insights,Employee Benefits,Retirement',
        'https://research.alexanderforbes.com/chapters/why-have-public-private-partnerships-not-been-optimal,Economy',
        'https://research.alexanderforbes.com/chapters/chapter-why-it-matters-the-role-of-employee-benefits,Insights,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/parts/why-retirement-isn-t-the-primary-issue,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-why-south-africans-cant-meet-their-funding-needs,Insights,Employee Benefits,Trustees,Investments',
        'https://research.alexanderforbes.com/parts/part-with-a-new-language-comes-a-new-solution,Financial well-being',
        'https://research.alexanderforbes.com/chapters/women-and-investing,Investments',
        'https://research.alexanderforbes.com/chapters/work-in-a-post-covid-world,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-workforce-analytics-and-productivity-contribution-of-older-workers,Retirement',
        'https://research.alexanderforbes.com/chapters/chapter-workplace-culture,Workplace environment',
        'https://research.alexanderforbes.com/chapters/chapter-workplace-solutions-for-financial-well-being,Financial well-being',
        'https://research.alexanderforbes.com/chapters/chapter-young-workers,Insights,Behavioural finance,Employee Benefits,Trustees',
        'https://research.alexanderforbes.com/chapters/chapter-young-workers-getting-it-right-from-the-start,Insights,Behavioural finance,Employee Benefits,Trustees'];

    const articleTagDict = {};
    articleTags.forEach((row) => {
        const url = row.split(',')[0];
        articleTagDict[url] = [];
        row.split(',').forEach((item, idx) => {
            if (idx > 0) {
                articleTagDict[url].push(item);
            }
        });
    });
    return articleTagDict;
}

function formImportedUrl(url) {
    const host = decodeURIComponent(url.split('host=')[1]);
    const path = new URL(url).pathname;
    return host + path;
}

const articleTagDict = buildArticleTagsMap();