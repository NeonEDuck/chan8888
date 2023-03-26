'use strict';

const trees = document.querySelectorAll('.tree');
const labelArray = '時來名其顯昭德益前勳皇朝滋雨露賢路裕經綸奕禩遵庭訓天申福自均';

document.addEventListener('readystatechange', () => {
    [...trees].map((tree) => {
        const treeLabel = tree.querySelector('.tree__label-container');
        let i = Number(tree.querySelector('.name-box').dataset.layer) || 0;
        tree.querySelector('.tree__title').querySelector('span').innerHTML = labelArray[i];
        do {
            const nameBoxes = [...tree.querySelectorAll(`[data-layer="${i}"]`)];
            if (nameBoxes.length === 0) { break; }
            const maxHeight =  Math.max(...nameBoxes.map((nameBox) => nameBox.clientHeight));
            treeLabel.appendChild(htmlToElement(`
                <div class="tree__label" style="height: ${maxHeight}px;"><span>(${labelArray[i]})</span></div>
            `));
            nameBoxes.map(nameBox => {
                nameBox.style.marginBlockEnd = `${maxHeight - nameBox.clientHeight}px`;
            });
        } while (++i);
    });
});

function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}