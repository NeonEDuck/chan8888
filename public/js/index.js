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

        const currentMember = tree.querySelector('[data-current-member="true"]');
        if (currentMember) {
            const siblings = [...tree.querySelector('.children').querySelectorAll(':scope > li')];
            const currentMemberWidth = currentMember.clientWidth;
            const childrenWidth = currentMember.querySelector('.children').clientWidth;

            const currentMemberIdx = siblings.findIndex((child) => child === currentMember);
            const horizontalGap = getComputedStyle(tree).getPropertyValue('--horizontal-gap');
            let horizontalGapInPx;
            const fontSize = getComputedStyle(document.querySelector(':root')).getPropertyValue('font-size');
            if (horizontalGap.endsWith('rem')) {
                horizontalGapInPx = Number(horizontalGap.substring(0, horizontalGap.length - 3)) * Number(fontSize.substring(0, fontSize.length - 2));
            }
            else {
                horizontalGapInPx = Number(horizontalGap.substring(0, horizontalGap.length - 2));
            }
            const olderMembersWidth = (currentMemberIdx * horizontalGapInPx) + siblings.slice(0, currentMemberIdx)
                .map((child) => child.clientWidth)
                .reduce((acc, cur) => acc + cur, 0);

            const youngerMembersWidth = ((siblings.length - currentMemberIdx - 1) * horizontalGapInPx) + siblings.slice(currentMemberIdx+1)
                .map((child) => child.clientWidth)
                .reduce((acc, cur) => acc + cur, 0);

            console.log(youngerMembersWidth)
            console.log((childrenWidth-currentMemberWidth)/2)
            console.log(Math.max(youngerMembersWidth, (childrenWidth-currentMemberWidth)/2) - youngerMembersWidth)

            siblings[0].style.marginInlineStart = `${Math.max(olderMembersWidth, (childrenWidth-currentMemberWidth)/2) - olderMembersWidth}px`;
            siblings[siblings.length - 1].style.marginInlineEnd = `${Math.max(youngerMembersWidth, (childrenWidth-currentMemberWidth)/2) - youngerMembersWidth}px`;

        }
    });
});

function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}