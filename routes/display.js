import { Router } from 'express'
import { assetsIndex } from './assets.js';

const router = Router();

router.get('/', async (req, res) => {
    const name = req.query.name;
    const imgArray = Object.entries(assetsIndex)
        .filter(([_, fileName]) => fileName.match(/\.(png|jpg|jpeg)$/i))
        .filter(([_, fileName]) => fileName.includes(name))
        .map(([fileId]) => fileId);
    const docxArray = Object.entries(assetsIndex)
        .filter(([_, fileName]) => fileName.match(/\.(doc|docx)$/i))
        .filter(([_, fileName]) => fileName.includes(name))
        .map(([fileId]) => fileId);

    res.render('display', { docxArray, imgArray });
})

export default router