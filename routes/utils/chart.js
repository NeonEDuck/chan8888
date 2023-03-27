import fs from 'fs';
import { assetsIndex, uploadFile, downloadFile } from '../assets.js';
import puppeteer from 'puppeteer';

const TITLE = [ '長', '次', '三', '四', '五', '六', '七', '八', '九', '十' ];

let familyJsonVersion;

async function updateChartImageOnDrive(rootTree) {
    if (!process.env.CHART_FOLDER_ID) {
        return;
    }
    console.log(`> updating family charts on drive.`);

    rootTree ??= await loadRawFamilyJson();
    const trees = searchChartedTreesInTree(rootTree);

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    if (process.env.LOW_MEMORY_MODE?.toLowerCase() === 'true') {
        for (const tree of trees) {
            const page = await browser.newPage();
            await page.goto(`http://localhost:${process.env.PORT ?? 80}?name=${tree.chart.name}`, {waitUntil: 'networkidle0'});
            await page.setViewport({
                width: 960,
                height: 760,
                deviceScaleFactor: 2,
            });
            const buffer = await page.screenshot({fullPage: true});
            await page.close();
            await uploadFile(buffer, `${tree.chart.name}.png`, process.env.CHART_FOLDER_ID);
        }
    }
    else {
        await Promise.all(trees.map(async (tree) => {
            const page = await browser.newPage();
            await page.goto(`http://localhost?name=${tree.chart.name}`, {waitUntil: 'networkidle0'});
            await page.setViewport({
                width: 960,
                height: 760,
                deviceScaleFactor: 2,
            });
            const buffer = await page.screenshot({fullPage: true});
            await page.close();
            await uploadFile(buffer, `${tree.chart.name}.png`, process.env.CHART_FOLDER_ID);
        }));
    }


    await browser.close();
    console.log(`> all family charts on drive are updated.`);
}


if (process.env.USE_LOCAL_FAMILY_FILE?.toLowerCase() === 'true') {
    if (fs.existsSync('./private/family.json')) {
        console.log('> Using family.json in the private folder.');
    }
    else {
        console.log('> Cannot find family.json in the private folder, fall back to use family.json on Google drive.');
    }
}

export async function loadRawFamilyJson() {
    if (process.env.USE_LOCAL_FAMILY_FILE?.toLowerCase() === 'true') {
        if (fs.existsSync('./private/family.json')) {
            return JSON.parse(fs.readFileSync('./private/family.json'))
        }
    }
    const [fileId, fileInfo] = Object.entries(assetsIndex).find(([key, {title}]) => (title === 'family.json'));
    let familyJsonCache;
    if (familyJsonVersion !== fileInfo.version) {
        console.log(`> fetch version ${fileInfo.version} of family.json.`);
        familyJsonCache = Buffer.from(await downloadFile(fileId)).toString();
        if (fs.existsSync('private/generated')) {
            fs.mkdirSync('private/generated', {recursive: true});
        }
        fs.writeFileSync('private/generated/family.json', Buffer.from(await downloadFile(fileId)).toString());
        familyJsonVersion = fileInfo.version;

        // updateChartImageOnDrive(familyJsonCache);
    }
    else {
        familyJsonCache = fs.readFileSync('private/generated/family.json');
    }
    return JSON.parse(familyJsonCache);
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
                    const t = Object.assign({}, tree);
                    t.currentMember = true;
                    return t;
                }
                return shallowCopyWithoutChildren(child);
            });
            // precedentCopy.children2 = precedent.children2?.map((child) => {
            //     if (child.name === tree.name) {
            //         return tree;
            //     }
            //     return shallowCopyWithoutChildren(child);
            // });

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