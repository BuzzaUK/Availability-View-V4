const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

class S3Service {
  constructor() {
    this.s3 = null;
    this.bucketName = process.env.AWS_S3_BUCKET;
    this.isConfigured = false;
    
    this.initializeS3();
  }

  initializeS3() {
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        AWS.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        });

        this.s3 = new AWS.S3();
        this.isConfigured = true;
        console.log('✅ AWS S3 configured successfully');
      } else {
        console.log('⚠️ AWS S3 credentials not found - using local storage');
      }
    } catch (error) {
      console.error('❌ AWS S3 configuration failed:', error.message);
    }
  }

  async uploadFile(filePath, key, metadata = {}) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured - using local storage');
    }

    try {
      const fileContent = fs.readFileSync(filePath);
      
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: this.getContentType(filePath),
        Metadata: metadata
      };

      const result = await this.s3.upload(params).promise();
      
      console.log(`✅ File uploaded to S3: ${key}`);
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        etag: result.ETag
      };
    } catch (error) {
      console.error('❌ S3 upload failed:', error.message);
      throw error;
    }
  }

  async downloadFile(key, downloadPath) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      const data = await this.s3.getObject(params).promise();
      fs.writeFileSync(downloadPath, data.Body);
      
      console.log(`✅ File downloaded from S3: ${key}`);
      return downloadPath;
    } catch (error) {
      console.error('❌ S3 download failed:', error.message);
      throw error;
    }
  }

  async deleteFile(key) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      console.log(`✅ File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ S3 delete failed:', error.message);
      throw error;
    }
  }

  async getFileUrl(key, expiresIn = 3600) {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };

      const url = this.s3.getSignedUrl('getObject', params);
      return url;
    } catch (error) {
      console.error('❌ S3 URL generation failed:', error.message);
      throw error;
    }
  }

  async listFiles(prefix = '') {
    if (!this.isConfigured) {
      throw new Error('S3 not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: prefix
      };

      const data = await this.s3.listObjectsV2(params).promise();
      return data.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag
      }));
    } catch (error) {
      console.error('❌ S3 list failed:', error.message);
      throw error;
    }
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  isAvailable() {
    return this.isConfigured;
  }
}

// Create singleton instance
const s3Service = new S3Service();

module.exports = s3Service;