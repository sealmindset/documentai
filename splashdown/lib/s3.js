const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const { createReadStream } = require('fs');

const BUCKET = process.env.S3_DOCUMENTS_BUCKET;
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

async function listObjects(prefix) {
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: '/',
  }));

  const folders = (result.CommonPrefixes || []).map((cp) => ({
    name: cp.Prefix.replace(prefix, '').replace(/\/$/, ''),
    prefix: cp.Prefix,
  }));

  const files = (result.Contents || [])
    .filter((obj) => obj.Key !== prefix)
    .map((obj) => ({
      key: obj.Key,
      name: obj.Key.replace(prefix, ''),
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

  return { folders, files };
}

async function uploadFile(key, filePath, contentType) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType || 'application/octet-stream',
    },
  });
  return upload.done();
}

async function getDownloadUrl(key) {
  const filename = key.split('/').pop();
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  }), { expiresIn: 300 });
}

async function createFolder(key) {
  return s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: '',
  }));
}

async function deleteObject(key) {
  return s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

module.exports = { listObjects, uploadFile, getDownloadUrl, createFolder, deleteObject };
