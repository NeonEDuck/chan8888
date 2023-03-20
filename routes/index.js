import { Router } from 'express'
import fs from 'fs'

const router = Router();

const TITLE = [ '長', '次', '三', '四', '五', '六', '七', '八', '九', '十' ];

router.get('/', (req, res) => {
    const family = JSON.parse(fs.readFileSync('./private/family.json'));
    // res.render('index.njk')
    const formatPersonData = (person, order) => {
        person.died     = person.died || false;
        person.bornDate = person.born || '';
        person.diedDate = (person.died === true) ? '' : (person.died || '');
        person.adopted  = person.adopted || false;
        person.divorced = person.divorced || false;
        person.useSimplifyPosition = person.useSimplifyPosition || '';

        if (person.adopted) {
            if (person.gender === 'm') {
                person.title = '養子';
            }
            else if (person.gender === 'f') {
                person.title = '養女';
            }
            else if (person.gender === 'w') {
                person.title = '媳婦';
            }
            else if (person.gender === 'h') {
                person.title = '女婿';
            }
        }
        else if (person.useSimplifyPosition) {
            if (person.gender === 'm') {
                person.title = '男';
            }
            else if (person.gender === 'f') {
                person.title = '女';
            }
            else if (person.gender === 'w') {
                person.title = '女';
            }
            else if (person.gender === 'h') {
                person.title = '男';
            }
        }
        else {
            if (person.gender === 'm') {
                person.title = TITLE[order] + '男';
            }
            else if (person.gender === 'f') {
                person.title = TITLE[order] + '女';
            }
            else if (person.gender === 'w') {
                person.title = TITLE[order] + '媳';
            }
            else if (person.gender === 'h') {
                person.title = TITLE[order] + '婿';
            }
        }

        person.nameTokens = [];
        let personName = person.name;
        while (personName.indexOf(':') !== -1) {
            const start = personName.indexOf(':');
            const end = personName.indexOf(':', start+1);

            if (start === -1 && end <= start) {
                break;
            }

            for (const c of personName.substring(0, start)) {
                person.nameTokens.push(c);
            }

            const fileName = personName.substring(start+1, end);
            const filePath = `private/extra_character/${fileName}`;
            if (fs.existsSync(filePath)) {
                if (fs.lstatSync(filePath).isFile()) {
                    const content = fs.readFileSync(filePath);
                    person.nameTokens.push(content);
                }
            }
            personName = personName.substring(end+1);
        }
        for (const c of personName) {
            person.nameTokens.push(c);
        }
    }

    const recursiveFormatPersonData = (person, order=0, layer=0, leftPadCarry=false) => {
        const parentCount = (person.partners?.length || 0) + 1;
        const childCount = (person.children?.length || 0) + (person.children2?.length || 0);
        person.parentCount = parentCount;
        person.childCount = childCount;
        person.leftPad = (leftPadCarry && parentCount === 2) || (parentCount === 2 && childCount === 1 && person.children[0].partners?.length === 2)

        formatPersonData(person, order);
        for (const partner of person.partners || []) {
            partner.gender = person.gender.replace('m', 'w').replace('f', 'h');
            partner.useSimplifyPosition = person.useSimplifyPosition;
            partner.adopted = person.adopted;
            formatPersonData(partner, order);
        }

        if (childCount === 1) {
            if (parentCount === 3) {
                recursiveFormatPersonData(person.children[0], 0, layer+1, true)
            }
            else {
                recursiveFormatPersonData(person.children[0], 0, layer+1, person.leftPad)
            }
        }
        else {
            for (const children of [(person.children2 || []), (person.children || [])]) {
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

                    recursiveFormatPersonData(child, childOrder, layer+1);
                }
            }
        }
    }

    recursiveFormatPersonData(family);

    res.render('index', {family});
})

export default router