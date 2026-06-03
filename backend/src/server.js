import dotenv from 'dotenv';
import app from './app.js';

// Load environment variables from the .env files
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});