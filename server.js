import express from 'express';
import routing from './routes/index';

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
routing(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;