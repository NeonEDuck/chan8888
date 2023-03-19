import { Router } from 'express'
import { assetsIndex } from './assets.js';

const router = Router();

router.get('/', async (req, res) => {
    const name = req.query.name;
    const imgArray = Object.entries(assetsIndex)
        .filter(([fileId, fileName]) => fileName.match(/\.(png|jpg|jpeg)$/i))
        .filter(([fileId, fileName]) => fileName.includes(name))
        .map(([fileId]) => fileId);

    res.render('display', {imgArray});
})

export default router