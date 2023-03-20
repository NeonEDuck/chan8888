import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import nunjucks from 'nunjucks';
import http from 'http';

const PORT = process.env.PORT || 80;
const app = express();

app.use(compression());

app.use('/', express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

nunjucks.configure('views', {
    autoescape: true,
    cache: false,
    express: app,
});

app.set('views', './views');
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);


import indexRouter from './routes/index.js';
import displayRouter from './routes/display.js';
import assetsRouter, { resetAssetsIndex } from './routes/assets.js';

app.use('', indexRouter);
app.use('/display', displayRouter);
app.use('/assets', assetsRouter);

const server = http.createServer(app);

server.listen(PORT, () => {console.log(`> Listening on port ${PORT}`)});