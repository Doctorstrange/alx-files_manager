import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const email = auth[0];
      const password = sha1(auth[1]);

      const user = await dbClient.getUser({ email });
      if (!user || password !== user.password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      const duration = 60 * 60 * 24; // 24 hours
      await redisClient.set(key, user._id.toString(), duration);

      return res.status(200).json({ token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const userToken = req.header('X-Token');
      const userKey = await redisClient.get(`auth_${userToken}`);
      if (!userKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${userToken}`);
      return res.status(204).send();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

export default AuthController;
