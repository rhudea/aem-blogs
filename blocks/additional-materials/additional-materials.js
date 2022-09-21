import embed from '../embed/embed.js'
export default function decorate(block) {
    const div = document.createElement('div');
    const mainHeading = document.createElement('h2');
    mainHeading.textContent = 'Additional Materials';
    div.append(mainHeading);

    block.querySelectorAll(':scope > div').forEach((row) => {
        const items = row.querySelectorAll('div');
        const title = items[0].textContent;
        const heading = items[1].textContent;
        const caption = items[2].textContent;
        const href = items[3].textContent;
        const size = items[4].textContent;
        const type = items[5].textContent;

        const arcDiv = document.createElement('div');

        const titleNode = document.createElement('h6');
        titleNode.textContent = title;
        arcDiv.append(titleNode);

        const headingNode = document.createElement('h5');
        headingNode.textContent = heading;
        arcDiv.append(headingNode);

        const captionNode = document.createElement('p');
        captionNode.textContent = caption;
        arcDiv.append(captionNode);

        if (type === 'mTypeVideo') {
            const embedDiv = document.createElement('div');
            const a = document.createElement('a');
            a.setAttribute('href', href);
            a.innerHTML = href;
            embedDiv.append(a);
            embed(embedDiv);
            arcDiv.append(embedDiv);
        } else {
            const downloadLink = document.createElement('a');
            downloadLink.textContent = 'Download';
            downloadLink.setAttribute('href', href);
            arcDiv.append(downloadLink);
        }

        div.append(arcDiv);
    });
    block.innerHTML = '';
    block.append(div);
} 