const { promisify } = require('util');

const storage = require('@google-cloud/storage');
const gcs = storage({ projectId: 'lights-io' });
const bucket = gcs.bucket('crawler-flight-data');
const upload = promisify(bucket.upload.bind(bucket));

const fs = require('fs');
const writeFile = promisify(fs.writeFile);

const save = async (path, data) => {
    await writeFile(path, JSON.stringify(data));
    await upload(path);
};

module.exports = { save };