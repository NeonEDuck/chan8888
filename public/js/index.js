'use strict';

const tree = document.querySelector('.tree');
const treeLabel = document.querySelector('.tree__label-container');
const labelArray = '時來名其顯昭德益前勳皇朝滋雨露賢路裕經綸奕禩遵庭訓天申福自均';

document.addEventListener('readystatechange', () => {
    let i = Number(tree.querySelector('.name-box').dataset.layer) || 0;
    do {
        const nameBoxes = [...tree.querySelectorAll(`[data-layer="${i}"]`)];
        if (nameBoxes.length === 0) { break; }
        const maxHeight =  Math.max(...nameBoxes.map((nameBox) => nameBox.clientHeight));
        treeLabel.appendChild(htmlToElement(`
            <div class="tree__label" style="height: ${maxHeight}px;"><span>(${labelArray[i]})</span></div>
        `))
    } while (++i);
});

function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}