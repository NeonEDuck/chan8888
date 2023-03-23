import dotenv from 'dotenv'
dotenv.config();
import fs from 'fs'
import path from 'path';
import process from 'process';
import { google } from 'googleapis';
import { auth } from 'google-auth-library';

const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

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

let assetsIndex;

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return auth.fromJSON(credentials);
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
    const key = JSON.parse(content);
    // const key = keys.installed || keys.web;
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
 * @return {OAuth2Client}
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    client = auth.fromJSON(credentials);
    client.scopes = SCOPES;

    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

const authClient = await authorize();

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
        // console.log('No files found.');
        return {};
    }
    const fileDict = Object.assign(...await Promise.all(files.map(async (file) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            return listFiles(authClient, file.id, file.title);
        }

        return {[file.id]: file.title};
    })));
    return fileDict;
}

/**
 * Downloads a file
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param {string} realFileId file ID
 * @return {Promise<ArrayBuffer>} Promise of the file data
 * */
async function downloadFile(realFileId) {
    // Get credentials and build service
    // TODO (developer) - Use appropriate auth mechanism for your app
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

async function resetAssetsIndex() {
    assetsIndex = await listFiles(authClient);
    // console.log('> Assets indexed!');
}
await resetAssetsIndex();
setInterval(resetAssetsIndex, 10000);

import { Router } from 'express';
import { Readable } from 'stream';
import mime from 'mime-types'
import libre from 'libreoffice-convert';
import util from 'util';
libre.convertAsync = util.promisify(libre.convert);

const router = Router();

router.get('/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    let buffer = Buffer.from(await downloadFile(fileId));
    let contentType = mime.lookup(assetsIndex[fileId]);

    // convert docx to pdf
    if ( contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || contentType === 'application/msword' ) {
        buffer = await libre.convertAsync(buffer, '.pdf', undefined);
        contentType = 'application/pdf';
    }

    const stream = new Readable();
    stream._read = () => {};
    stream.push(buffer);
    stream.push(null);

    res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength
    });
    stream.pipe(res);
});

export { resetAssetsIndex, assetsIndex, downloadFile };
export default router;