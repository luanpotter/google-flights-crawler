const { promisify } = require('util');

const storage = require('@google-cloud/storage');
const gcs = storage({ projectId: 'lights-io' });
const bucket = gcs.bucket('crawler-flight-data');

const fs = require('fs');
const writeFile = promisify(fs.writeFile);

const save = async (path, data) => {
    await writeFile(path, JSON.stringify(data));
    await new Promise(r => bucket.upload(path, r));
};

module.exports = { save };