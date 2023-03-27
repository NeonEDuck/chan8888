import fs from 'fs';
import { assetsIndex, downloadFile } from '../assets.js';

const TITLE = [ '長', '次', '三', '四', '五', '六', '七', '八', '九', '十' ];

export async function loadRawFamilyJson() {
    if (process.env.USE_LOCAL_FAMILY_FILE?.toLowerCase() === 'true') {
        if (fs.existsSync('./private/family.json')) {
            console.log('> Using family.json in the private folder.')
            return JSON.parse(fs.readFileSync('./private/family.json'))
        }
        else {
            console.log('> Cannot find family.json in the private folder, fall back to use family.json on Google drive.')
        }
    }
    const fileId = Object.entries(assetsIndex).find(([key, value]) => (value === 'family.json'))[0];
    return JSON.parse(Buffer.from(await downloadFile(fileId)).toString());
}

export function formatMemberData(member, order, layer) {
    member.died     ??= false;
    member.bornDate = member.born ?? '';
    member.diedDate = (member.died === true) ? '' : (member.died || '');
    member.adopted  ??= false;
    member.divorced ??= false;
    member.layer    = layer;
    member.useSimplifyPosition ??= '';

    if (member.adopted) {
        if (member.gender === 'm') {
            member.title = '養子';
        }
        else if (member.gender === 'f') {
            member.title = '養女';
        }
        else if (member.gender === 'w') {
            member.title = '媳婦';
        }
        else if (member.gender === 'h') {
            member.title = '女婿';
        }
    }
    else if (member.useSimplifyPosition) {
        if (member.gender === 'm') {
            member.title = '男';
        }
        else if (member.gender === 'f') {
            member.title = '女';
        }
        else if (member.gender === 'w') {
            member.title = '女';
        }
        else if (member.gender === 'h') {
            member.title = '男';
        }
    }
    else {
        if (member.gender === 'm') {
            member.title = TITLE[order] + '男';
        }
        else if (member.gender === 'f') {
            member.title = TITLE[order] + '女';
        }
        else if (member.gender === 'w') {
            member.title = TITLE[order] + '媳';
        }
        else if (member.gender === 'h') {
            member.title = TITLE[order] + '婿';
        }
    }

    member.nameTokens = [];
    let personName = member.name;
    while (personName.indexOf(':') !== -1) {
        const start = personName.indexOf(':');
        const end = personName.indexOf(':', start+1);

        if (start === -1 && end <= start) {
            break;
        }

        for (const c of personName.substring(0, start)) {
            member.nameTokens.push(c);
        }

        const fileName = personName.substring(start+1, end);
        const filePath = `private/extra_character/${fileName}`;
        if (fs.existsSync(filePath)) {
            if (fs.lstatSync(filePath).isFile()) {
                const content = fs.readFileSync(filePath);
                member.nameTokens.push(content);
            }
        }
        personName = personName.substring(end+1);
    }
    for (const c of personName) {
        member.nameTokens.push(c);
    }
}

export function formatTree(member, order=0, layer=0, leftPadCarry=false) {
    const parentCount = (member.partners?.length || 0) + 1;
    const childCount = (member.children?.length || 0) + (member.children2?.length || 0);
    member.parentCount = parentCount;
    member.childCount = childCount;
    member.leftPad = (leftPadCarry && parentCount === 2) || (parentCount === 2 && childCount === 1 && member.children[0].partners?.length === 2)

    formatMemberData(member, order, layer);
    for (const partner of member.partners || []) {
        partner.gender = member.gender.replace('m', 'w').replace('f', 'h');
        partner.useSimplifyPosition = member.useSimplifyPosition;
        partner.adopted = member.adopted;
        formatMemberData(partner, order, layer);
    }

    if (childCount === 1) {
        if (parentCount === 3) {
            formatTree(member.children[0], 0, layer+1, true)
        }
        else {
            formatTree(member.children[0], 0, layer+1, member.leftPad)
        }
    }
    else {
        for (const children of [(member.children2 || []), (member.children || [])]) {
            let maleCount = 0, femaleCount = 0;
            for (const child of children) {
                let childOrder = 0;
                if (child.adopted) {
                    // pass
                }
                else if (['m', 'ms'].includes(child.gender)) {
                    childOrder = maleCount++;
                }
                else {
                    childOrder = femaleCount++;
                }

                formatTree(child, childOrder, layer+1);
            }
        }
    }
}

function shallowCopyWithoutChildren(tree) {
    return Object.assign({},
        Object.keys(tree)
            .filter(key => !['children', 'children2', 'childCount'].includes(key))
            .reduce((acc, cur) => (acc[cur] = tree[cur], acc), {}),
        { 'childCount': 0 }
    )
}

export function searchChartedTreesInTree(tree, precedent) {
    const result = [];
    if (tree.chart !== undefined) {
        if (precedent) {
            const precedentCopy = structuredClone(precedent);
            precedentCopy.chart = tree.chart
            precedentCopy.children = precedent.children?.map((child) => {
                if (child.name === tree.name) {
                    return tree;
                }
                return shallowCopyWithoutChildren(child);
            });
            precedentCopy.children2 = precedent.children2?.map((child) => {
                if (child.name === tree.name) {
                    return tree;
                }
                return shallowCopyWithoutChildren(child);
            });

            result.push(precedentCopy);
        }
        else {
            result.push(tree);
        }
    }
    return [
        ...result,
        ...[].concat(...tree.children?.map((child) => searchChartedTreesInTree(child, tree)) || []),
        ...[].concat(...tree.children2?.map((child) => searchChartedTreesInTree(child, tree)) || []),
    ]
}