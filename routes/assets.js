import dotenv from 'dotenv'
dotenv.config();
import fs from 'fs'
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

// const ASSETS_FOLDER_PATH = './private/assets';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.photos.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

async function indexAssets(authClient) {
    // try {
    //     if ((fs.lstatSync(ASSETS_FOLDER_PATH)).isDirectory()) {
    //         fs.rmSync(ASSETS_FOLDER_PATH, {recursive: true, force: true });
    //     }
    // }
    // catch (error) {

    // }

    // fs.mkdirSync(ASSETS_FOLDER_PATH);

    // console.log('Files:');
    const index = await listFiles(authClient);
    // fs.writeFileSync(path.join('private', 'assetsIndex.json'), JSON.stringify(index));
    console.log('Assets indexed!');
    return index;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient, folderId=ROOT_FOLDER_ID, folderPath='\\') {
    const drive = google.drive({version: 'v2', auth: authClient});
    const res = await drive.files.list({
        // pageSize: 10,
        // fields: 'nextPageToken, files(id, name, mimeType)',
        q: `'${folderId}' in parents and trashed=false`
    });
    const files = res.data.items;
    if (files.length === 0) {
        console.log('No files found.');
        return;
    }
    const fileDict = Object.assign(...await Promise.all(files.map(async (file) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            // return listFiles(authClient, file.id, path.join(folderPath, file.title));
            return listFiles(authClient, file.id, file.title);
        }

        // return {[file.id]: path.join(folderPath, file.title)};
        return {[file.id]: file.title};
        // fs.writeFileSync(path.join(targetFolderPath, file.title), Buffer.from(new Uint8Array(await downloadFile(authClient, file.id))));
        // console.log(`${folderPath}\t${file.title} (${file.id}, ${file.mimeType})`);
    })));
    return fileDict;
}

/**
 * Downloads a file
 * @param{string} realFileId file ID
 * @return{obj} file status
 * */
async function downloadFile(authClient, realFileId) {
    // Get credentials and build service
    // TODO (developer) - Use appropriate auth mechanism for your app

    // const auth = new GoogleAuth({
    //     scopes: 'https://www.googleapis.com/auth/drive',
    // });
    const service = google.drive({version: 'v2', auth: authClient});

    const fileId = realFileId;
    try {
        const file = await service.files.get({
            fileId: fileId,
        });
        if (file.data.downloadUrl) {
            let response = new Blob();
            try {
                response = await fetch(file.data.downloadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authClient.credentials.access_token}`
                    }
                });
            }
            catch (error) {
                console.error(file)
                console.error(file.title)
                throw error;
            }
            return response.arrayBuffer()
        } else {
            callback(null);
        }

        return file.data;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

const authClient = await authorize();
const assetsIndex = await indexAssets(authClient);

export { assetsIndex };

import { Router } from 'express';
import { Readable } from 'stream';
import mime from 'mime-types'

const router = Router();

router.get('/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    // const assetsIndex = JSON.parse(fs.readFileSync('./private/assets_index.json'));
    // const fileName = `${fileId}${assetsIndex[fileId].match(/\.[0-9a-z]+$/i)[0]}`;
    // const filePath = path.join('./private/assets/', assetsIndex[fileId]);
    // const fileDir = path.dirname(filePath);

    // if (!fs.existsSync(fileDir)) {
    //     fs.mkdirSync(path.dirname(filePath), {recursive: true});
    // }

    // if (Object.keys(assetsIndex).includes(fileId)) {
    //     fs.writeFileSync(
    //         filePath,
    //         Buffer.from(new Uint8Array(await downloadFile(authClient, fileId)))
    //     );
    // }
    const buffer = Buffer.from(new Uint8Array(await downloadFile(authClient, fileId)))

    const stream = new Readable();
    stream._read = () => {}
    stream.push(buffer)
    stream.push(null)

    // res.download(filePath);
    // const stat = fs.statSync(filePath);
    // console.log(stat.size);
    // console.log(buffer.byteLength + 1);
    res.writeHead(200, {
        'Content-Type': mime.lookup(assetsIndex[fileId]),
        'Content-Length': buffer.byteLength
    });

    // const readStream = fs.createReadStream(filePath);
    // We replaced all the event handlers with a simple call to readStream.pipe()
    stream.pipe(res);
    // readStream.pipe(res);
})

export default router