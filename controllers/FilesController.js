import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../dbClient.js';
import redisClient from '../redisClient.js';

class FilesController {
  static async postUpload(req, res) {
    const { name, type, data, parentId = '0', isPublic = false } = req.body;
    const token = req.headers['x-token'];

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type or not accepted' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== '0') {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectID(parentId) });
      if (!parentFile || parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent not found or is not a folder' });
      }
    }

    let localPath = '';
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      localPath = `${folderPath}/${uuidv4()}`;
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
    }

    const newFile = {
      userId: dbClient.ObjectID(userId),
      name,
      type,
      isPublic,
      parentId: dbClient.ObjectID(parentId),
      localPath: type !== 'folder' ? localPath : undefined,
    };

    try {
      const result = await dbClient.db.collection('files').insertOne(newFile);
      return res.status(201).json({
        id: result.insertedId,
        userId: newFile.userId,
        name: newFile.name,
        type: newFile.type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Error creating file' });
    }
  }
}

export default FilesController;