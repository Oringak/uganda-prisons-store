const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSettingsMap } = require('../db');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

async function getAwsConfig() {
  const settings = await getSettingsMap().catch(() => ({}));
  const region = process.env.AWS_REGION || settings.aws_region || 'eu-west-1';
  const bucket = process.env.AWS_S3_BUCKET || settings.aws_s3_bucket || '';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  const publicUrl = process.env.AWS_S3_PUBLIC_URL || settings.aws_s3_public_url || '';

  const configured = Boolean(bucket && accessKeyId && secretAccessKey);
  return { configured, region, bucket, accessKeyId, secretAccessKey, publicUrl };
}

async function getStorageStatus() {
  const cfg = await getAwsConfig();
  return {
    provider: cfg.configured ? 'AWS S3' : 'Local Disk Storage (AWS S3 Ready)',
    awsConfigured: cfg.configured,
    bucket: cfg.bucket || 'Not configured yet',
    region: cfg.region,
  };
}

function sanitizeFilename(originalName = 'file') {
  const ext = path.extname(originalName).toLowerCase() || '.bin';
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${Date.now()}-${rand}-${base}${ext}`;
}

async function uploadMediaFile(file, folder = 'general') {
  if (!file || !file.buffer) {
    throw new Error('No file provided');
  }

  const filename = sanitizeFilename(file.originalname);
  const key = `${folder}/${filename}`;
  const cfg = await getAwsConfig();

  if (cfg.configured) {
    const client = new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      })
    );

    const url = cfg.publicUrl
      ? `${cfg.publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;

    return { url, storage: 'aws-s3', key };
  }

  // Fallback to local disk uploads folder
  const targetDir = path.join(UPLOADS_ROOT, folder);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, filename);
  fs.writeFileSync(targetPath, file.buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    storage: 'local',
    key,
  };
}

module.exports = {
  uploadMediaFile,
  getStorageStatus,
  UPLOADS_ROOT,
};
