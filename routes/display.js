import { Router } from 'express'
import { assetsIndex } from './assets.js';

const router = Router();

router.get('/', async (req, res) => {
    const name = req.query.name;
    const imgArray = Object.entries(assetsIndex)
        .filter(([_, {title: fileName}]) => fileName.match(/\.(png|jpg|jpeg)$/i))
        .filter(([_, {title: fileName}]) => fileName.match(new RegExp(`(?:(?:^.*(?:詹|\\P{Script=Han})|^))${name}(?:\\s|\\.).*`, 'u')))
        .map(([fileId]) => fileId);
    const docxArray = Object.entries(assetsIndex)
        .filter(([_, {title: fileName}]) => fileName.match(/\.(doc|docx)$/i))
        .filter(([_, {title: fileName}]) => fileName.match(new RegExp(`(?:(?:^.*(?:詹|\\P{Script=Han})|^))${name}(?:\\s|\\.).*`, 'u')))
        .map(([fileId]) => fileId);

    res.render('display', { docxArray, imgArray });
})

export default router
// \P{Script=Han}