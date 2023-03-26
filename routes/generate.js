import { Router } from 'express'
import fs from 'fs';
import { loadRawFamilyJson, formatTree, searchChartedTreesInTree } from './utils/chart.js';
import puppeteer from 'puppeteer';

const router = Router();

router.get('/chart', async (req, res) => {
    const rootTree = await loadRawFamilyJson();
    const trees = searchChartedTreesInTree(rootTree);

    if (!fs.existsSync('private/generated/images')) {
        fs.mkdirSync('private/generated/images', { recursive: true });
    }

    const browser = await puppeteer.launch();

    await Promise.all(trees.map(async (tree) => {
        const page = await browser.newPage();
        await page.goto(`http://localhost?name=${tree.chart.name}`, {waitUntil: 'networkidle0'});
        await page.setViewport({
            width: 960,
            height: 760,
            deviceScaleFactor: 2,
        });
        await page.screenshot({fullPage: true, path: `private/generated/images/${tree.chart.name}.png`});
        await page.close();
    }));

    await browser.close();

    res.send('Charts generated');
});

export default router