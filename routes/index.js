import { Router } from 'express'
import { loadRawFamilyJson, formatTree, searchChartedTreesInTree } from './utils/chart.js';

const router = Router();

router.get('/', async (req, res) => {
    const name = req.query.name;
    let rootTree = await loadRawFamilyJson();
    formatTree(rootTree);

    if (name) {
        const trees = searchChartedTreesInTree(rootTree);
        rootTree = trees.find((tree) => tree.chart.name === name);
    }

    res.render('index', {rootTree});
})

export default router