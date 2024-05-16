import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const hashPwd = sha1(password);

    try {
      const collection = dbClient.db.collection('users');
      const user1 = await collection.findOne({ email });

      if (user1) {
        return res.status(400).json({ error: 'Already exist' });
      } else {
        await collection.insertOne({ email, password: hashPwd });
        const newUser = await collection.findOne(
          { email }, { projection: { email: 1 } }
        );
        return res.status(201).json({ id: newUser._id, email: newUser.email });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    try {
      const userToken = req.header('X-Token');
      const authKey = `auth_${userToken}`;
      const userID = await redisClient.get(authKey);
      if (!userID) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await dbClient.getUser({ _id: ObjectId(userID) });
      return res.json({ id: user._id, email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
